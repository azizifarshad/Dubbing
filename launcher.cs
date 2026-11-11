using System;
using System.IO;
using System.Diagnostics;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;
using System.Reflection;

[assembly: AssemblyTitle("Dubbing Vidans")]
[assembly: AssemblyDescription("Dubbing Vidans Studio Launcher")]
[assembly: AssemblyCompany("Vidans Studio")]
[assembly: AssemblyProduct("Dubbing Vidans")]
[assembly: AssemblyCopyright("Copyright © Vidans Studio 2026")]
[assembly: AssemblyVersion("1.0.1.0")]
[assembly: AssemblyFileVersion("1.0.1.0")]

namespace DubbingVidans
{
    static class AppLauncher
    {
        private static Process serverProcess = null;
        private static Process appWindowProcess = null;

        [STAThread]
        static void Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(appDir);

            // 1. Resolve or auto-install Node.js
            string nodePath = ResolveOrInstallNode(appDir);
            if (string.IsNullOrEmpty(nodePath))
            {
                MessageBox.Show(
                    "محیط Node.js یافت نشد و نصب خودکار امکان‌پذیر نبود.\nلطفاً یک‌بار Node.js را نصب نمایید.",
                    "Dubbing Vidans",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            // 2. Start server if port 3000 is not already responding
            if (!IsPortOpen("127.0.0.1", 3000, 400))
            {
                StartServer(appDir, nodePath);

                // Wait up to 60 seconds for server to be responsive
                bool ready = false;
                for (int i = 0; i < 300; i++)
                {
                    Thread.Sleep(200);
                    if (IsPortOpen("127.0.0.1", 3000, 300))
                    {
                        ready = true;
                        break;
                    }
                }

                if (!ready)
                {
                    MessageBox.Show(
                        "سرور محلی استودیو دوبله ویدانس در زمان مقرر پاسخ نداد.\nلطفاً از سالم بودن فایل‌ها اطمینان حاصل فرمایید.",
                        "Dubbing Vidans",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    KillServerProcess();
                    return;
                }
            }

            // 3. Launch dedicated desktop window via Edge or Chrome
            string browserPath = FindStandaloneBrowser();
            string userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "DubbingVidans",
                "UserData"
            );

            try
            {
                Directory.CreateDirectory(userDataDir);
            }
            catch { }

            string appUrl = "http://localhost:3000";

            if (!string.IsNullOrEmpty(browserPath))
            {
                string browserArgs = string.Format(
                    "--app=\"{0}\" --window-size=1366,820 --user-data-dir=\"{1}\" --app-id=DubbingVidans --no-first-run --no-default-browser-check",
                    appUrl,
                    userDataDir
                );

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = browserPath,
                    Arguments = browserArgs,
                    UseShellExecute = false
                };

                appWindowProcess = Process.Start(psi);

                if (appWindowProcess != null)
                {
                    appWindowProcess.WaitForExit();
                }
            }
            else
            {
                // Fallback to default browser
                Process.Start(new ProcessStartInfo
                {
                    FileName = appUrl,
                    UseShellExecute = true
                });

                Thread.Sleep(3000);
            }

            // Clean up server when window is closed
            KillServerProcess();
        }

        private static string ResolveOrInstallNode(string appDir)
        {
            // Check direct local runtime candidates
            string[] candidates = new string[]
            {
                Path.Combine(appDir, "runtime", "node.exe"),
                Path.Combine(appDir, "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
            };

            foreach (string p in candidates)
            {
                if (File.Exists(p))
                {
                    return p;
                }
            }

            // Check PATH
            try
            {
                Process p = new Process();
                p.StartInfo.FileName = "where.exe";
                p.StartInfo.Arguments = "node";
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.RedirectStandardOutput = true;
                p.StartInfo.CreateNoWindow = true;
                p.Start();
                string output = p.StandardOutput.ReadToEnd();
                p.WaitForExit();

                if (!string.IsNullOrEmpty(output))
                {
                    string first = output.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0].Trim();
                    if (File.Exists(first))
                    {
                        return first;
                    }
                }
            }
            catch { }

            // Attempt automatic background installation via winget
            try
            {
                Process pWinget = new Process();
                pWinget.StartInfo.FileName = "winget";
                pWinget.StartInfo.Arguments = "install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent";
                pWinget.StartInfo.UseShellExecute = false;
                pWinget.StartInfo.CreateNoWindow = true;
                pWinget.Start();
                pWinget.WaitForExit(90000);

                // Re-check standard install path
                string standardPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
                if (File.Exists(standardPath))
                {
                    return standardPath;
                }
            }
            catch { }

            return null;
        }

        private static void StartServer(string appDir, string nodePath)
        {
            string serverCjs = Path.Combine(appDir, "server.cjs");
            string serverJs = Path.Combine(appDir, "server.js");
            string serverTs = Path.Combine(appDir, "server.ts");

            ProcessStartInfo psi = new ProcessStartInfo
            {
                WorkingDirectory = appDir,
                WindowStyle = ProcessWindowStyle.Hidden,
                CreateNoWindow = true,
                UseShellExecute = false
            };

            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = "3000";

            string runtimePython = Path.Combine(appDir, "runtime", "python");
            string runtimeFfmpeg = Path.Combine(appDir, "runtime", "ffmpeg");
            string currentPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            psi.EnvironmentVariables["PATH"] = runtimePython + ";" + runtimeFfmpeg + ";" + currentPath;

            if (File.Exists(serverCjs))
            {
                psi.FileName = nodePath;
                psi.Arguments = "\"" + serverCjs + "\"";
            }
            else if (File.Exists(serverJs))
            {
                psi.FileName = nodePath;
                psi.Arguments = "\"" + serverJs + "\"";
            }
            else
            {
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c npx tsx \"" + serverTs + "\"";
            }

            try
            {
                serverProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "خطا در اجرای سرور برنامه:\n" + ex.Message,
                    "Dubbing Vidans",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static bool IsPortOpen(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindStandaloneBrowser()
        {
            string[] relativePaths = new string[]
            {
                @"Microsoft\Edge\Application\msedge.exe",
                @"Google\Chrome\Application\chrome.exe"
            };

            string[] baseDirs = new string[]
            {
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
            };

            foreach (string rel in relativePaths)
            {
                foreach (string b in baseDirs)
                {
                    string full = Path.Combine(b, rel);
                    if (File.Exists(full))
                    {
                        return full;
                    }
                }
            }

            return null;
        }

        private static void KillServerProcess()
        {
            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    Process killer = Process.Start(new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = string.Format("/pid {0} /T /F", serverProcess.Id),
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                    if (killer != null)
                    {
                        killer.WaitForExit(3000);
                    }
                }
            }
            catch { }
        }
    }
}
