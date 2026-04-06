import { exec } from "child_process";
import { NextResponse } from "next/server";

function run(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 4000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

export async function GET() {
  // 1. NVIDIA (dedicated) – unchanged
  try {
    const [name, vram, computeCap, driver] = await Promise.all([
      run(`nvidia-smi --query-gpu=name --format=csv,noheader`),
      run(`nvidia-smi --query-gpu=memory.total --format=csv,noheader`),
      run(`nvidia-smi --query-gpu=compute_cap --format=csv,noheader`),
      run(`nvidia-smi --query-gpu=driver_version --format=csv,noheader`),
    ]);

    const vramGB = Math.floor(parseInt(vram) / 1024);
    const computeNum = parseFloat(computeCap);

    return NextResponse.json({
      gpu: name.trim(),
      vram: `${vramGB} GB`,
      computeCapability: computeCap,
      driverVersion: driver,
      type: "dedicated",
      suitable: vramGB >= 8 && computeNum >= 6.0,
      checks: {
        vram: vramGB >= 8,
        compute: computeNum >= 6.0,
        driver: true,
      },
    });
  } catch {
    // 2. Fallback: Any other GPU (Intel iGPU, AMD, etc.) – FULLY DYNAMIC
    let gpuName = "Unknown GPU";
    let frequency = "";
    let driverVersion = "N/A";
    let totalRamGB = "Unknown";
    let isIntegrated = false;

    try {
      // Linux detection
      const lspciOutput = await run(`lspci | grep -iE 'vga|3d|display' | head -1`);

      gpuName = lspciOutput
        .split(":")[2]
        .replace(/Intel Corporation/i, "Intel")
        .replace(/ Corporation/i, "")
        .trim();

      // === MAX frequency (much better than current idle 0.35 GHz) ===
      const maxMHz = await run(`cat /sys/class/drm/card*/gt_RP1_freq_mhz 2>/dev/null | head -1`);
      if (maxMHz && !isNaN(Number(maxMHz))) {
        const maxGhz = (Number(maxMHz) / 1000).toFixed(2);
        //frequency = ` @ ${maxGhz} GHz`;
      }

      // === Real kernel driver ===
      try {
        const driverLine = await run(
          `lspci -k | grep -iE 'vga|3d|display' -A 2 | grep -i 'kernel driver in use' | head -1`
        );
        if (driverLine) {
          driverVersion = driverLine.replace(/.*Kernel driver in use:\s*/i, "").trim() + " (Linux)";
        }
      } catch {}

      // === Total system RAM (for shared iGPU VRAM) ===
      totalRamGB = await run(`awk '/MemTotal/ {print int($2/1024/1024)}' /proc/meminfo 2>/dev/null || echo "Unknown"`);

      // Detect if it's integrated
      const lowerName = gpuName.toLowerCase();
      isIntegrated =
        lowerName.includes("intel") ||
        lowerName.includes("uhd") ||
        lowerName.includes("hd graphics") ||
        lowerName.includes("radeon graphics") ||
        lowerName.includes("vega");

    } catch {
      // Windows fallback (still dynamic)
      try {
        gpuName = await run(
          `powershell -command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1"`
        );
        isIntegrated = /intel|uhd|hd graphics|radeon graphics|vega/i.test(gpuName);
        driverVersion = "Unknown (Windows)";
      } catch {}
    }

    if (!gpuName || gpuName === "Unknown GPU") {
      gpuName = "Could not detect GPU";
    }

    const displayName = gpuName + frequency + (isIntegrated ? " [Integrated]" : "");

    return NextResponse.json({
      gpu: displayName,
      vram: isIntegrated
        ? `Shared (~${totalRamGB} GB system RAM)`
        : "Unknown",
      computeCapability: "N/A",
      driverVersion: driverVersion,
      type: isIntegrated ? "integrated" : "unknown",
      suitable: false,
      checks: {
        vram: false,
        compute: false,
        driver: driverVersion !== "N/A",
      },
      warning: isIntegrated
        ? "Integrated GPU detected. Not suitable for heavy ML training."
        : "GPU detected but type could not be clearly identified.",
    });
  }
}