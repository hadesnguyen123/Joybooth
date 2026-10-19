using System;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Diagnostics;

namespace FotolismCanonDaemon {
    public class CaptureJob {
        public string SavePath;
        public bool Success;
        public long LatencyMs;
        public long FileSize;
        public string ErrorMessage;
        public ManualResetEvent DoneEvent = new ManualResetEvent(false);
    }

    class Program {
        public const uint kEdsPropID_SaveTo = 0x0000000b;
        public const uint kEdsSaveTo_Host = 2;
        public const uint kEdsSaveTo_Both = 3;
        public const uint kEdsPropID_Evf_OutputDevice = 0x00000500;
        public const uint kEdsEvfOutputDevice_PC = 2;

        public const uint kEdsPropID_AEModeSelect = 0x00000400;
        public const uint kEdsPropID_Tv = 0x00000405;
        public const uint kEdsPropID_Av = 0x00000404;
        public const uint kEdsPropID_ISOSpeed = 0x00000402;
        public const uint kEdsPropID_BatteryLevel = 0x00000407;

        public const uint kEdsCameraCommand_TakePicture = 0x00000000;
        public const uint kEdsCameraCommand_ExtendShutDownTimer = 0x00000001;
        public const uint kEdsCameraCommand_PressShutterButton = 0x00000004;
        public const int kEdsCameraCommand_ShutterButton_OFF = 0x00000000;
        public const int kEdsCameraCommand_ShutterButton_Halfway = 0x00000001;
        public const int kEdsCameraCommand_ShutterButton_Completely = 0x00000003;
        public const int kEdsCameraCommand_ShutterButton_Completely_NonAF = 0x00010003;

        public const uint kEdsObjectEvent_All = 0x00000200;
        public const uint kEdsObjectEvent_DirItemRequestTransfer = 0x00000208;
        public const uint kEdsObjectEvent_DirItemCreated = 0x00000204;
        public const uint kEdsObjectEvent_DirItemRequestTransferDT = 0x00000209;

        [StructLayout(LayoutKind.Sequential)]
        public struct EdsCapacity {
            public int numberOfFreeClusters;
            public int bytesPerSector;
            public int reset;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public struct EdsDirectoryItemInfo {
            public ulong size;
            public int isFolder;
            public uint groupID;
            public uint option;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
            public string szFileName;
            public uint format;
            public uint dateTime;
        }

        public delegate uint EdsObjectEventHandler(uint inEvent, IntPtr inRef, IntPtr inContext);

        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsInitializeSDK();
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsTerminateSDK();
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetCameraList(out IntPtr list);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetChildCount(IntPtr inRef, out int count);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetChildAtIndex(IntPtr inRef, int index, out IntPtr outRef);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsOpenSession(IntPtr cam);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsCloseSession(IntPtr cam);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsSendCommand(IntPtr camera, uint command, int param);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsSetPropertyData(IntPtr cam, uint propId, int param, int size, ref uint data);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetPropertyData(IntPtr inRef, uint inPropertyID, int inParam, int inPropertySize, out uint outPropertyData);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsSetCapacity(IntPtr camera, EdsCapacity capacity);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsSetObjectEventHandler(IntPtr camera, uint inEvent, EdsObjectEventHandler inEventHandler, IntPtr inContext);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetDirectoryItemInfo(IntPtr dirItem, out EdsDirectoryItemInfo outInfo);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsCreateFileStream([MarshalAs(UnmanagedType.LPStr)] string inFileName, uint inCreateDisposition, uint inDesiredAccess, out IntPtr outStream);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsDownload(IntPtr dirItem, ulong inReadSize, IntPtr outStream);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsDownloadComplete(IntPtr dirItem);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsCreateMemoryStream(ulong inSize, out IntPtr outStream);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsCreateEvfImageRef(IntPtr inStream, out IntPtr outEvfImage);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsDownloadEvfImage(IntPtr cam, IntPtr evfImage);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetPointer(IntPtr inStream, out IntPtr outPointer);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetLength(IntPtr inStream, out ulong outLength);
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsGetEvent();
        [DllImport(@"C:\Program Files\Canon\EOS Webcam Utility Pro\EDSDK.dll")]
        public static extern uint EdsRelease(IntPtr inRef);

        private static IntPtr CameraRef = IntPtr.Zero;
        private static bool IsSessionOpen = false;
        private static string CurrentSavePath = "";
        private static bool CaptureSuccess = false;
        private static long CurrentDownloadedSize = 0;
        private static byte[] LatestEvfFrame = null;
        private static readonly object FrameLock = new object();
        private static EdsObjectEventHandler HandlerRef;

        private static readonly object JobLock = new object();
        private static CaptureJob PendingJob = null;
        private static bool ShouldExit = false;

        public static uint HandleObjectEvent(uint inEvent, IntPtr inRef, IntPtr inContext) {
            Console.WriteLine("[DAEMON EVENT] Event received: 0x{0:X8}", inEvent);
            if (inEvent == kEdsObjectEvent_DirItemRequestTransfer || inEvent == kEdsObjectEvent_DirItemCreated || inEvent == kEdsObjectEvent_DirItemRequestTransferDT) {
                if (CaptureSuccess) {
                    if (inRef != IntPtr.Zero) EdsRelease(inRef);
                    return 0;
                }
                EdsDirectoryItemInfo info;
                uint err = EdsGetDirectoryItemInfo(inRef, out info);
                Console.WriteLine("[DAEMON EVENT] ItemInfo: err=0x{0:X8}, size={1}, file={2}", err, info.size, info.szFileName);
                if (err == 0 && !string.IsNullOrEmpty(CurrentSavePath)) {
                    string dir = Path.GetDirectoryName(CurrentSavePath);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) {
                        Directory.CreateDirectory(dir);
                    }

                    // 1. Thử ghi trực tiếp vào FileStream
                    IntPtr fileStream;
                    uint stErr = EdsCreateFileStream(CurrentSavePath, 1, 2, out fileStream);
                    if (stErr == 0) {
                        uint dlErr = EdsDownload(inRef, info.size, fileStream);
                        EdsDownloadComplete(inRef);
                        EdsRelease(fileStream);

                        if (dlErr == 0 && File.Exists(CurrentSavePath) && new FileInfo(CurrentSavePath).Length > 1000) {
                            CaptureSuccess = true;
                            CurrentDownloadedSize = new FileInfo(CurrentSavePath).Length;
                            Console.WriteLine("[DAEMON] 24MP Photo downloaded via FileStream: " + CurrentSavePath + " (" + CurrentDownloadedSize + " bytes)");
                        } else {
                            Console.WriteLine("[DAEMON] FileStream download failed: 0x{0:X8}", dlErr);
                        }
                    } else {
                        // 2. Dự phòng MemoryStream nếu FileStream bị chặn
                        Console.WriteLine("[DAEMON] EdsCreateFileStream failed: 0x{0:X8}. Trying MemoryStream...", stErr);
                        IntPtr memStream;
                        uint memErr = EdsCreateMemoryStream(info.size, out memStream);
                        if (memErr == 0) {
                            uint dlErr = EdsDownload(inRef, info.size, memStream);
                            EdsDownloadComplete(inRef);
                            if (dlErr == 0) {
                                IntPtr ptr;
                                EdsGetPointer(memStream, out ptr);
                                if (ptr != IntPtr.Zero) {
                                    byte[] bytes = new byte[info.size];
                                    Marshal.Copy(ptr, bytes, 0, (int)info.size);
                                    File.WriteAllBytes(CurrentSavePath, bytes);
                                    CaptureSuccess = true;
                                    CurrentDownloadedSize = bytes.Length;
                                    Console.WriteLine("[DAEMON] 24MP Photo downloaded via MemoryStream: " + CurrentSavePath + " (" + bytes.Length + " bytes)");
                                }
                            }
                            EdsRelease(memStream);
                        }
                    }
                }
                if (inRef != IntPtr.Zero) EdsRelease(inRef);
            } else if (inRef != IntPtr.Zero) {
                EdsRelease(inRef);
            }
            return 0;
        }

        static void Main(string[] args) {
            Console.WriteLine("=== FOTOLISM CANON EDSDK PERSISTENT DAEMON (HIGH SPEED) ===");
            EdsInitializeSDK();

            HttpListener listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:8899/");
            listener.Start();
            Console.WriteLine("[DAEMON] HTTP Service listening on http://127.0.0.1:8899/");

            Thread httpThread = new Thread(() => {
                while (listener.IsListening && !ShouldExit) {
                    try {
                        var ctx = listener.GetContext();
                        ThreadPool.QueueUserWorkItem((state) => HandleRequest(ctx));
                    } catch { break; }
                }
            });
            httpThread.IsBackground = true;
            httpThread.Start();

            DateTime lastKeepAlive = DateTime.Now;

            // Vòng lặp chính quản lý Camera, EVF & Trigger Shutter trên Main Thread (Single-Threaded PTP)
            while (!ShouldExit) {
                EnsureCameraConnected();

                // Chống ngủ cho máy ảnh Canon (mỗi 15 giây gửi ExtendShutDownTimer 1 lần)
                if (IsSessionOpen && CameraRef != IntPtr.Zero && (DateTime.Now - lastKeepAlive).TotalSeconds > 15) {
                    EdsSendCommand(CameraRef, kEdsCameraCommand_ExtendShutDownTimer, 0);
                    lastKeepAlive = DateTime.Now;
                }

                // Kiểm tra xem có lệnh chụp đang chờ hay không
                CaptureJob currentJob = null;
                lock (JobLock) {
                    currentJob = PendingJob;
                    PendingJob = null;
                }

                if (currentJob != null) {
                    ExecuteShutter(currentJob);
                } else {
                    if (IsSessionOpen) {
                        PullEvfFrame();
                    }
                    EdsGetEvent();
                    Thread.Sleep(25); // ~40 FPS EVF
                }
            }

            if (IsSessionOpen && CameraRef != IntPtr.Zero) {
                EdsCloseSession(CameraRef);
                EdsRelease(CameraRef);
            }
            EdsTerminateSDK();
            Console.WriteLine("[DAEMON] Stopped cleanly.");
        }

        static void ExecuteShutter(CaptureJob job) {
            if (!IsSessionOpen || CameraRef == IntPtr.Zero) {
                job.Success = false;
                job.ErrorMessage = "Camera session not open";
                job.DoneEvent.Set();
                return;
            }

            Stopwatch sw = Stopwatch.StartNew();
            CurrentSavePath = job.SavePath;
            CaptureSuccess = false;
            CurrentDownloadedSize = 0;

            Console.WriteLine("[DAEMON] Triggering single shutter for: " + job.SavePath);

            // 1. Kích hoạt nút chụp tức thì Completely_NonAF (Zero AF Lag, không đèn trợ nét)
            uint errShoot = EdsSendCommand(CameraRef, kEdsCameraCommand_PressShutterButton, kEdsCameraCommand_ShutterButton_Completely_NonAF);
            Console.WriteLine("[DAEMON] Shutter Completely_NonAF sent: 0x{0:X8}", errShoot);

            // Nếu camera vừa kéo frame EVF và báo bận (0x00000081 DeviceBusy), nhả nút và thử lại sau 60ms
            if (errShoot == 0x00000081) {
                Thread.Sleep(60);
                EdsSendCommand(CameraRef, kEdsCameraCommand_PressShutterButton, kEdsCameraCommand_ShutterButton_OFF);
                Thread.Sleep(30);
                errShoot = EdsSendCommand(CameraRef, kEdsCameraCommand_PressShutterButton, kEdsCameraCommand_ShutterButton_Completely_NonAF);
                Console.WriteLine("[DAEMON] Retry Shutter Completely_NonAF sent: 0x{0:X8}", errShoot);
            }

            // 2. Chờ nhận file ảnh 24MP từ camera (thời gian phơi sáng + truyền USB thực tế: ~1.0-1.3 giây)
            // Ngay khi ảnh đã tải xong (CaptureSuccess = true), thoát vòng lặp ngay lập tức
            for (int i = 0; i < 70; i++) {
                EdsGetEvent();
                if (CaptureSuccess) break;
                Thread.Sleep(50);
            }

            // 3. Luôn nhả nút chụp về OFF sau khi ảnh đã chụp xong để đưa máy ảnh trở lại luồng EVF Liveview
            EdsSendCommand(CameraRef, kEdsCameraCommand_PressShutterButton, kEdsCameraCommand_ShutterButton_OFF);

            // 4. Bơm nhẹ sự kiện để luồng EVF tiếp tục mượt mà
            for (int i = 0; i < 4; i++) {
                EdsGetEvent();
                Thread.Sleep(25);
            }

            sw.Stop();
            job.Success = CaptureSuccess && File.Exists(job.SavePath) && new FileInfo(job.SavePath).Length > 1000;
            job.FileSize = job.Success ? new FileInfo(job.SavePath).Length : CurrentDownloadedSize;
            job.LatencyMs = sw.ElapsedMilliseconds;
            if (!job.Success) {
                job.ErrorMessage = "Timeout: Không nhận được file ảnh trả về sau khi bấm máy";
            }
            Console.WriteLine("[DAEMON] Shutter finished. Success=" + job.Success + ", Latency=" + job.LatencyMs + "ms, Size=" + job.FileSize + " bytes");
            job.DoneEvent.Set();
        }

        static void EnsureCameraConnected() {
            if (IsSessionOpen) return;
            try {
                IntPtr list;
                uint err = EdsGetCameraList(out list);
                if (err != 0) return;
                int count = 0;
                EdsGetChildCount(list, out count);
                if (count > 0) {
                    IntPtr cam;
                    EdsGetChildAtIndex(list, 0, out cam);
                    uint openErr = EdsOpenSession(cam);
                    if (openErr != 0) {
                        for (int attempt = 0; attempt < 5; attempt++) {
                            Thread.Sleep(150);
                            openErr = EdsOpenSession(cam);
                            if (openErr == 0) break;
                        }
                    }

                    if (openErr == 0) {
                        CameraRef = cam;
                        IsSessionOpen = true;

                        uint saveTo = kEdsSaveTo_Both;
                        uint stErr = EdsSetPropertyData(cam, kEdsPropID_SaveTo, 0, sizeof(uint), ref saveTo);
                        if (stErr != 0) {
                            saveTo = kEdsSaveTo_Host;
                            EdsSetPropertyData(cam, kEdsPropID_SaveTo, 0, sizeof(uint), ref saveTo);
                        }

                        EdsCapacity cap = new EdsCapacity { numberOfFreeClusters = 0x7FFFFFFF, bytesPerSector = 0x1000, reset = 1 };
                        EdsSetCapacity(cam, cap);

                        HandlerRef = new EdsObjectEventHandler(HandleObjectEvent);
                        EdsSetObjectEventHandler(cam, kEdsObjectEvent_All, HandlerRef, IntPtr.Zero);

                        uint dev = kEdsEvfOutputDevice_PC;
                        uint devErr = EdsSetPropertyData(cam, kEdsPropID_Evf_OutputDevice, 0, sizeof(uint), ref dev);
                        Console.WriteLine("[DAEMON] SetEvfOutputDevice: 0x{0:X8}", devErr);
                        Console.WriteLine("[DAEMON] Camera Session OPENED & EVF Activated successfully!");
                    } else {
                        Console.WriteLine("[DAEMON] EdsOpenSession error: 0x{0:X8}", openErr);
                        EdsRelease(cam);
                    }
                }
                EdsRelease(list);
            } catch (Exception ex) {
                Console.WriteLine("[DAEMON] Connection error: " + ex.Message);
            }
        }

        static void PullEvfFrame() {
            if (!IsSessionOpen || CameraRef == IntPtr.Zero) return;
            try {
                IntPtr stream;
                uint strErr = EdsCreateMemoryStream(0, out stream);
                if (strErr != 0) return;
                IntPtr evfRef;
                uint evfErr = EdsCreateEvfImageRef(stream, out evfRef);
                if (evfErr == 0) {
                    uint dlErr = EdsDownloadEvfImage(CameraRef, evfRef);
                    if (dlErr == 0) {
                        ulong len;
                        EdsGetLength(stream, out len);
                        IntPtr ptr;
                        EdsGetPointer(stream, out ptr);
                        if (len > 0 && ptr != IntPtr.Zero) {
                            byte[] buf = new byte[len];
                            Marshal.Copy(ptr, buf, 0, (int)len);
                            lock (FrameLock) {
                                LatestEvfFrame = buf;
                            }
                        }
                    } else if (dlErr == 0x000000A2 || dlErr == 0x00000080 || dlErr == 0x00000081 || dlErr == 0x00000006) {
                        Console.WriteLine("[DAEMON] Camera disconnected (0x{0:X8}). Resetting session.", dlErr);
                        IsSessionOpen = false;
                        try { EdsCloseSession(CameraRef); EdsRelease(CameraRef); } catch {}
                        CameraRef = IntPtr.Zero;
                    }
                    EdsRelease(evfRef);
                }
                EdsRelease(stream);
            } catch { }
        }

        static void HandleRequest(HttpListenerContext ctx) {
            try {
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                ctx.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
                ctx.Response.Headers.Add("Access-Control-Allow-Headers", "*");

                if (ctx.Request.HttpMethod == "OPTIONS") {
                    ctx.Response.StatusCode = 200;
                    ctx.Response.Close();
                    return;
                }

                bool isHead = ctx.Request.HttpMethod == "HEAD";
                string path = ctx.Request.Url.AbsolutePath.ToLowerInvariant();

                if (path == "/status") {
                    uint aeMode = 0;
                    uint tv = 0;
                    uint av = 0;
                    uint iso = 0;
                    uint battery = 0;
                    if (IsSessionOpen && CameraRef != IntPtr.Zero) {
                        EdsGetPropertyData(CameraRef, kEdsPropID_AEModeSelect, 0, sizeof(uint), out aeMode);
                        EdsGetPropertyData(CameraRef, kEdsPropID_Tv, 0, sizeof(uint), out tv);
                        EdsGetPropertyData(CameraRef, kEdsPropID_Av, 0, sizeof(uint), out av);
                        EdsGetPropertyData(CameraRef, kEdsPropID_ISOSpeed, 0, sizeof(uint), out iso);
                        EdsGetPropertyData(CameraRef, kEdsPropID_BatteryLevel, 0, sizeof(uint), out battery);
                    }
                    string json = string.Format(
                        "{{\"connected\":{0},\"evfReady\":{1},\"aeMode\":{2},\"tv\":\"0x{3:X}\",\"av\":\"0x{4:X}\",\"iso\":\"0x{5:X}\",\"battery\":{6}}}",
                        IsSessionOpen ? "true" : "false",
                        (LatestEvfFrame != null) ? "true" : "false",
                        aeMode, tv, av, iso, battery
                    );
                    byte[] bytes = Encoding.UTF8.GetBytes(json);
                    ctx.Response.ContentType = "application/json";
                    ctx.Response.ContentLength64 = bytes.Length;
                    if (!isHead) {
                        ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                    }
                    ctx.Response.Close();
                    return;
                }

                if (path == "/frame") {
                    byte[] frame = null;
                    lock (FrameLock) {
                        frame = LatestEvfFrame;
                    }
                    if (frame != null && frame.Length > 0) {
                        ctx.Response.ContentType = "image/jpeg";
                        ctx.Response.ContentLength64 = frame.Length;
                        if (!isHead) {
                            ctx.Response.OutputStream.Write(frame, 0, frame.Length);
                        }
                    } else {
                        ctx.Response.StatusCode = 404;
                    }
                    ctx.Response.Close();
                    return;
                }

                if (path == "/liveview") {
                    ctx.Response.ContentType = "multipart/x-mixed-replace; boundary=--myboundary";
                    var output = ctx.Response.OutputStream;
                    try {
                        while (ctx.Response.OutputStream.CanWrite && !ShouldExit) {
                            byte[] frame = null;
                            lock (FrameLock) { frame = LatestEvfFrame; }
                            if (frame != null && frame.Length > 0) {
                                byte[] header = Encoding.ASCII.GetBytes("\r\n--myboundary\r\nContent-Type: image/jpeg\r\nContent-Length: " + frame.Length + "\r\n\r\n");
                                output.Write(header, 0, header.Length);
                                output.Write(frame, 0, frame.Length);
                                output.Flush();
                            }
                            Thread.Sleep(30); // ~33 FPS
                        }
                    } catch { }
                    return;
                }

                if (path == "/capture") {
                    string savePath = ctx.Request.QueryString["savePath"];
                    if (string.IsNullOrEmpty(savePath)) {
                        savePath = @"F:\Fotolism_image\fotolism_shot_" + DateTime.Now.Ticks + ".jpg";
                    }

                    CaptureJob job = new CaptureJob { SavePath = savePath };
                    lock (JobLock) {
                        PendingJob = job;
                    }

                    // Chờ Main Thread xử lý lệnh chụp tối đa 6.5 giây
                    bool completed = job.DoneEvent.WaitOne(6500);
                    string resJson;
                    if (completed && job.Success) {
                        resJson = string.Format("{{\"success\":true,\"savedPath\":\"{0}\",\"sizeBytes\":{1},\"latencyMs\":{2},\"source\":\"Canon EOS R100 (EDSDK Persistent Daemon)\",\"resolution\":\"24MP (Full Resolution)\"}}",
                            job.SavePath.Replace("\\", "\\\\"), job.FileSize, job.LatencyMs);
                    } else {
                        string err = completed ? job.ErrorMessage : "Timeout: Camera daemon không phản hồi sau 6.5s";
                        resJson = string.Format("{{\"success\":false,\"error\":\"{0}\"}}", err.Replace("\"", "\\\""));
                    }

                    byte[] resBytes = Encoding.UTF8.GetBytes(resJson);
                    ctx.Response.ContentType = "application/json";
                    ctx.Response.OutputStream.Write(resBytes, 0, resBytes.Length);
                    ctx.Response.Close();
                    return;
                }

                if (path == "/quit") {
                    ShouldExit = true;
                    byte[] ok = Encoding.UTF8.GetBytes("{\"ok\":true}");
                    ctx.Response.ContentType = "application/json";
                    ctx.Response.OutputStream.Write(ok, 0, ok.Length);
                    ctx.Response.Close();
                    return;
                }

                ctx.Response.StatusCode = 404;
                ctx.Response.Close();
            } catch (Exception ex) {
                try {
                    ctx.Response.Abort();
                } catch { }
            }
        }
    }
}
