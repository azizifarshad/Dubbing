import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

export interface HardwareInfo {
  machineGuid: string;
  computerUuid: string;
  processorId: string;
  baseboardSerial: string;
  diskSerial: string;
  computerName: string;
  osName: string;
  cpuModel: string;
  hardwareFingerprint: string;
}

export interface DeviceIdentity {
  devicePublicKeyPem: string;
  encryptedPrivateKey: string; // base64
  iv: string; // base64
  authTag: string; // base64
  hardwareFingerprint: string;
  createdAt: string;
}

export function getSharedDataDir(): string {
  const base = process.env.ProgramData || 'C:\\ProgramData';
  const targetDir = path.join(base, 'DubbingVidans');

  if (fs.existsSync(targetDir)) {
    return targetDir;
  }

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    return targetDir;
  } catch (err) {
    // Fallback to local directory if ProgramData is inaccessible
    const localFallback = path.join(process.cwd(), '.license_data');
    if (!fs.existsSync(localFallback)) {
      try {
        fs.mkdirSync(localFallback, { recursive: true });
      } catch {}
    }
    return localFallback;
  }
}

// Helper to run a shell command safely
function runCommand(cmd: string, timeoutMs: number = 4000): string {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// Get Windows MachineGuid from registry
function getMachineGuid(): string {
  try {
    const raw = runCommand('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid');
    const match = raw.match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9\-]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {}
  return 'DEFAULT-MACHINE-GUID';
}

let cachedHardwareInfo: HardwareInfo | null = null;

// Collect hardware properties via CIM / PowerShell
export function getHardwareInfo(forceRefresh: boolean = false): HardwareInfo {
  if (cachedHardwareInfo && !forceRefresh) {
    return cachedHardwareInfo;
  }

  const machineGuid = getMachineGuid();

  // Query hardware specs in a single PowerShell command
  const psScript = `
    $ErrorActionPreference = 'SilentlyContinue';
    $cs = Get-CimInstance Win32_ComputerSystemProduct | Select-Object -First 1;
    $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1;
    $bb = Get-CimInstance Win32_BaseBoard | Select-Object -First 1;
    $disk = Get-CimInstance Win32_DiskDrive | Select-Object -First 1;
    Write-Output "UUID:$($cs.UUID)"
    Write-Output "CPU_ID:$($cpu.ProcessorId)"
    Write-Output "CPU_NAME:$($cpu.Name)"
    Write-Output "BB_SERIAL:$($bb.SerialNumber)"
    Write-Output "DISK_SERIAL:$($disk.SerialNumber)"
  `.replace(/\r?\n\s*/g, ' ');

  const rawOut = runCommand(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`);

  let computerUuid = '';
  let processorId = '';
  let baseboardSerial = '';
  let diskSerial = '';
  let cpuModel = '';

  for (const line of rawOut.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('UUID:')) computerUuid = trimmed.slice(5).trim();
    else if (trimmed.startsWith('CPU_ID:')) processorId = trimmed.slice(7).trim();
    else if (trimmed.startsWith('CPU_NAME:')) cpuModel = trimmed.slice(9).trim();
    else if (trimmed.startsWith('BB_SERIAL:')) baseboardSerial = trimmed.slice(10).trim();
    else if (trimmed.startsWith('DISK_SERIAL:')) diskSerial = trimmed.slice(12).trim();
  }

  // Fallbacks if CIM properties return empty
  if (!computerUuid) computerUuid = machineGuid;
  if (!processorId) processorId = os.cpus()[0]?.model || 'GENERIC-CPU';
  if (!baseboardSerial) baseboardSerial = 'GENERIC-BASEBOARD';
  if (!diskSerial) diskSerial = 'GENERIC-DISK';
  if (!cpuModel) cpuModel = os.cpus()[0]?.model || 'Standard CPU';

  // Generate SHA256 fingerprint from hardware identifiers
  const canonicalString = [
    `GUID=${machineGuid}`,
    `UUID=${computerUuid}`,
    `CPUID=${processorId}`,
    `BOARD=${baseboardSerial}`,
    `DISK=${diskSerial}`,
  ].join(';');

  const hardwareFingerprint = crypto
    .createHash('sha256')
    .update(canonicalString, 'utf8')
    .digest('hex');

  cachedHardwareInfo = {
    machineGuid,
    computerUuid,
    processorId,
    baseboardSerial,
    diskSerial,
    computerName: os.hostname() || process.env.COMPUTERNAME || 'WINDOWS-PC',
    osName: `${os.type()} ${os.release()} (${os.arch()})`,
    cpuModel,
    hardwareFingerprint,
  };

  return cachedHardwareInfo;
}

// Derive encryption key bound to hardware
function deriveMachineKey(hwFingerprint: string, machineGuid: string): Buffer {
  const salt = 'DubbingVidans_Hardware_Binding_Salt_v1';
  return crypto.pbkdf2Sync(`${hwFingerprint}:${machineGuid}`, salt, 100000, 32, 'sha256');
}

// Get or generate local device keypair
export function getOrCreateDeviceIdentity(): {
  devicePublicKeyPem: string;
  devicePrivateKeyPem: string;
  hardwareFingerprint: string;
} {
  const sharedDir = getSharedDataDir();
  const identityFilePath = path.join(sharedDir, '.device_identity');
  const hw = getHardwareInfo();
  const derivedKey = deriveMachineKey(hw.hardwareFingerprint, hw.machineGuid);

  if (fs.existsSync(identityFilePath)) {
    try {
      const content = fs.readFileSync(identityFilePath, 'utf8');
      const identity: DeviceIdentity = JSON.parse(content);

      if (identity.hardwareFingerprint !== hw.hardwareFingerprint) {
        throw new Error('HARDWARE_MISMATCH');
      }

      const iv = Buffer.from(identity.iv, 'base64');
      const authTag = Buffer.from(identity.authTag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(identity.encryptedPrivateKey, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        devicePublicKeyPem: identity.devicePublicKeyPem,
        devicePrivateKeyPem: decrypted,
        hardwareFingerprint: hw.hardwareFingerprint,
      };
    } catch (err: any) {
      console.warn('[Hardware Identity] Existing identity invalid:', err?.message);
    }
  }

  // Create new keypair if not found
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const devicePublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const devicePrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(devicePrivateKeyPem, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  const newIdentity: DeviceIdentity = {
    devicePublicKeyPem,
    encryptedPrivateKey: encrypted,
    iv: iv.toString('base64'),
    authTag,
    hardwareFingerprint: hw.hardwareFingerprint,
    createdAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(identityFilePath, JSON.stringify(newIdentity, null, 2), { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed to write .device_identity:', err);
  }

  return {
    devicePublicKeyPem,
    devicePrivateKeyPem,
    hardwareFingerprint: hw.hardwareFingerprint,
  };
}
