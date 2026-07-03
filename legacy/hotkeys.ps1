param(
  [int]$Port = 8765
)

$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @"
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public static class DotaCdHotkeyBridge
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;

    private static readonly ConcurrentQueue<string> Queue = new ConcurrentQueue<string>();
    private static readonly Dictionary<string, long> LastEventAt = new Dictionary<string, long>();
    private static readonly object Gate = new object();
    private static LowLevelKeyboardProc _proc = HookCallback;
    private static IntPtr _hookId = IntPtr.Zero;
    private static Thread _thread;

    public static void Start()
    {
        if (_thread != null) return;
        _thread = new Thread(RunHookThread);
        _thread.IsBackground = true;
        _thread.Start();
    }

    public static string DrainJson()
    {
        var items = new List<string>();
        string item;
        while (Queue.TryDequeue(out item))
        {
            items.Add(item);
        }
        return "[" + string.Join(",", items.ToArray()) + "]";
    }

    public static void SetClipboardText(string text)
    {
        Exception failure = null;
        var thread = new Thread(() =>
        {
            try
            {
                Clipboard.SetText(text ?? "");
            }
            catch (Exception error)
            {
                failure = error;
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join(1500);
        if (failure != null) throw failure;
    }

    private static void RunHookThread()
    {
        _hookId = SetHook(_proc);
        MSG msg;
        while (GetMessage(out msg, IntPtr.Zero, 0, 0))
        {
            TranslateMessage(ref msg);
            DispatchMessage(ref msg);
        }
        UnhookWindowsHookEx(_hookId);
    }

    private static IntPtr SetHook(LowLevelKeyboardProc proc)
    {
        return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(null), 0);
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && ((int)wParam == WM_KEYDOWN || (int)wParam == WM_SYSKEYDOWN))
        {
            int vkCode = Marshal.ReadInt32(lParam);
            bool ctrl = IsDown(0x11) || IsDown(0xA2) || IsDown(0xA3);
            bool alt = IsDown(0x12) || IsDown(0xA4) || IsDown(0xA5);
            bool shift = IsDown(0x10) || IsDown(0xA0) || IsDown(0xA1);
            string key = MapKey(vkCode);

            if (ctrl && alt && key != null)
            {
                string action = shift ? "copy" : "start";
                Enqueue(action, key);
            }
        }

        return CallNextHookEx(_hookId, nCode, wParam, lParam);
    }

    private static void Enqueue(string action, string key)
    {
        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        string signature = action + ":" + key;

        lock (Gate)
        {
            long previous;
            if (LastEventAt.TryGetValue(signature, out previous) && now - previous < 280)
            {
                return;
            }
            LastEventAt[signature] = now;
        }

        Queue.Enqueue("{\"id\":\"" + now + "-" + key + "\",\"action\":\"" + action + "\",\"key\":\"" + key + "\"}");
    }

    private static string MapKey(int vkCode)
    {
        if (vkCode >= 0x30 && vkCode <= 0x39) return ((char)vkCode).ToString();
        if (vkCode >= 0x60 && vkCode <= 0x69) return (vkCode - 0x60).ToString();
        if (vkCode >= 0x41 && vkCode <= 0x5A) return ((char)vkCode).ToString();
        return null;
    }

    private static bool IsDown(int vkCode)
    {
        return (GetAsyncKeyState(vkCode) & 0x8000) != 0;
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr hwnd;
        public uint message;
        public UIntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public int pt_x;
        public int pt_y;
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    private static extern bool TranslateMessage(ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessage(ref MSG lpMsg);
}
"@

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [string]$Body
  )

  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $header = "HTTP/1.1 $StatusCode $StatusText`r`n" +
    "Content-Type: $ContentType; charset=utf-8`r`n" +
    "Content-Length: $($bodyBytes.Length)`r`n" +
    "Access-Control-Allow-Origin: *`r`n" +
    "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n" +
    "Access-Control-Allow-Headers: Content-Type`r`n" +
    "Cache-Control: no-store`r`n" +
    "Connection: close`r`n`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  $Stream.Write($bodyBytes, 0, $bodyBytes.Length)
}

function Read-HttpRequest {
  param([System.Net.Sockets.NetworkStream]$Stream)

  $buffer = New-Object byte[] 65536
  $bytesRead = $Stream.Read($buffer, 0, $buffer.Length)
  if ($bytesRead -le 0) { return $null }

  $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
  $headerEnd = $requestText.IndexOf("`r`n`r`n")
  if ($headerEnd -lt 0) { return $null }

  $headersText = $requestText.Substring(0, $headerEnd)
  $body = $requestText.Substring($headerEnd + 4)
  $lines = $headersText -split "`r`n"
  $requestLine = $lines[0] -split " "
  $contentLength = 0

  foreach ($line in $lines) {
    if ($line -match "^Content-Length:\s*(\d+)") {
      $contentLength = [int]$Matches[1]
    }
  }

  while ([System.Text.Encoding]::UTF8.GetByteCount($body) -lt $contentLength) {
    $more = New-Object byte[] 4096
    $count = $Stream.Read($more, 0, $more.Length)
    if ($count -le 0) { break }
    $body += [System.Text.Encoding]::UTF8.GetString($more, 0, $count)
  }

  [pscustomobject]@{
    Method = $requestLine[0]
    Path = $requestLine[1]
    Body = $body
  }
}

[DotaCdHotkeyBridge]::Start()

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
$listener.Start()

Write-Host "Dota Enemy CD hotkey bridge is running on http://127.0.0.1:$Port"
Write-Host "Start timer: Ctrl+Alt+assigned key"
Write-Host "Copy chat text: Ctrl+Alt+Shift+assigned key"
Write-Host "Leave this window open while playing. Press Ctrl+C here to stop."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $request = Read-HttpRequest -Stream $stream
      if ($null -eq $request) {
        continue
      }

      if ($request.Method -eq "OPTIONS") {
        Write-HttpResponse -Stream $stream -StatusCode 204 -StatusText "No Content" -ContentType "text/plain" -Body ""
      } elseif ($request.Method -eq "GET" -and $request.Path.StartsWith("/events")) {
        Write-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType "application/json" -Body ([DotaCdHotkeyBridge]::DrainJson())
      } elseif ($request.Method -eq "GET" -and $request.Path.StartsWith("/health")) {
        Write-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType "application/json" -Body '{"ok":true}'
      } elseif ($request.Method -eq "POST" -and $request.Path.StartsWith("/clipboard")) {
        [DotaCdHotkeyBridge]::SetClipboardText($request.Body)
        Write-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType "application/json" -Body '{"ok":true}'
      } else {
        Write-HttpResponse -Stream $stream -StatusCode 404 -StatusText "Not Found" -ContentType "application/json" -Body '{"ok":false}'
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
