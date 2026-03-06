import { useState, useEffect } from "react";

const BOOT_LINES = [
  "[    0.000000] Linux version 6.1.0-portfolio (ushnish@dev) (gcc 12.2.0)",
  "[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-6.1.0 root=/dev/sda1",
  "[    0.000000] BIOS-provided physical RAM map:",
  "[    0.000000]  BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable",
  "[    0.000001] NX (Execute Disable) protection: active",
  "[    0.000001] DMI: Portfolio Machine v1.0/Terminal, BIOS 1.0 03/06/2026",
  "[    0.004000] CPU: Intel(R) Core(TM) i9-13900K @ 5.80GHz",
  "[    0.004200] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point'",
  "[    0.006000] Memory: 32768MB RAM available",
  "[    0.008000] Calibrating delay loop... 11600.00 BogoMIPS",
  "[    0.012000] pid_max: default: 32768 minimum: 301",
  "[    0.014000] Mount-cache hash table entries: 65536",
  "[    0.016000] Performance Events: Zen4 PMU driver",
  "[    0.020000] NET: Registered PF_NETLINK/PF_ROUTE protocol family",
  "[    0.024000] PCI: Using configuration type 1 for base access",
  "[    0.028000] ACPI: Added _OSI(Module Device)",
  "[    0.032000] clocksource: tsc: mask: 0xffffffffffffffff",
  "[    0.036000] SCSI subsystem initialized",
  "[    0.038000] usb core: registered new interface driver hub",
  "[    0.040000] Loading portfolio modules...",
  "[    0.042000] [portfolio] skills.ko loaded successfully",
  "[    0.044000] [portfolio] experience.ko loaded successfully",
  "[    0.046000] [portfolio] projects.ko loaded successfully",
  "[    0.048000] [portfolio] contact.ko loaded successfully",
  "[    0.052000] EXT4-fs (sda1): mounted filesystem with ordered data mode",
  "[    0.056000] systemd[1]: Detected architecture x86-64",
  "[    0.058000] systemd[1]: Set hostname to <portfolio-terminal>",
  "[    0.060000] systemd[1]: Reached target Local File Systems",
  "[    0.062000] systemd[1]: Started Network Manager",
  "[    0.064000] systemd[1]: Starting Portfolio Terminal Service...",
  "",
  "  ██████╗  ██████╗ ██████╗ ████████╗███████╗ ██████╗ ██╗     ██╗ ██████╗ ",
  "  ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗",
  "  ██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║   ██║██║     ██║██║   ██║",
  "  ██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║   ██║██║     ██║██║   ██║",
  "  ██║     ╚██████╔╝██║  ██║   ██║   ██║     ╚██████╔╝███████╗██║╚██████╔╝",
  "  ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ",
  "",
  "[    OK    ] Portfolio Terminal Service started.",
  "[    OK    ] System ready.",
  "",
];

interface BootSequenceProps {
  onComplete: () => void;
}

export const BootSequence = ({ onComplete }: BootSequenceProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines((prev) => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setDone(true), 600);
        setTimeout(() => onComplete(), 1200);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`min-h-screen bg-background text-foreground font-mono p-4 md:p-6 transition-opacity duration-500 ${done ? "opacity-0" : "opacity-100"}`}>
      <div className="max-w-4xl mx-auto">
        {lines.map((line, idx) => (
          <div key={idx} className="text-glow text-sm md:text-base leading-tight whitespace-pre">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
