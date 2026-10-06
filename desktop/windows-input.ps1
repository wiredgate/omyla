$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class OmylaInput {
 [StructLayout(LayoutKind.Sequential)] public struct Mouse { public int x,y; public uint data,flags,time; public IntPtr extra; }
 [StructLayout(LayoutKind.Sequential)] public struct Key { public ushort vk,scan; public uint flags,time; public IntPtr extra; }
 [StructLayout(LayoutKind.Explicit, Size=40)] public struct Input { [FieldOffset(0)] public uint type; [FieldOffset(8)] public Mouse mouse; [FieldOffset(8)] public Key key; }
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern uint SendInput(uint n, Input[] inputs,int size);
 [DllImport("user32.dll")] public static extern bool SetPhysicalCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
 [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd,uint flags);
 [StructLayout(LayoutKind.Sequential)] public struct Point { public int x,y; }
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd,StringBuilder text,int size);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint id);
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
 public static void Send(Input[] inputs) { if(SendInput((uint)inputs.Length,inputs,Marshal.SizeOf(typeof(Input)))!=inputs.Length) throw new Exception("input_rejected"); }
 public static Input Keyboard(ushort vk,ushort scan,uint flags) { return new Input{type=1,key=new Key{vk=vk,scan=scan,flags=flags}}; }
 public static void Type(string text) { foreach(char c in text) { Send(new Input[]{Keyboard(0,c,4),Keyboard(0,c,6)}); } }
 public static void Click(bool twice) { for(int i=0;i<(twice?2:1);i++) { Send(new Input[]{new Input{type=0,mouse=new Mouse{flags=2}},new Input{type=0,mouse=new Mouse{flags=4}}}); if(twice) System.Threading.Thread.Sleep(75); } }
 public static void Scroll(int ticks) { Send(new Input[]{new Input{type=0,mouse=new Mouse{flags=0x0800,data=unchecked((uint)(ticks*120))}}}); }
 public static void Keys(ushort first,ushort second) { if(second==0) Send(new Input[]{Keyboard(first,0,0),Keyboard(first,0,2)}); else Send(new Input[]{Keyboard(first,0,0),Keyboard(second,0,0),Keyboard(second,0,2),Keyboard(first,0,2)}); }
}
'@
[void][OmylaInput]::SetProcessDPIAware()
function Inspect-Target {
 $point=[OmylaInput+Point]::new(); $point.x=[int]$request.x; $point.y=[int]$request.y
 $window=[OmylaInput]::GetAncestor([OmylaInput]::WindowFromPoint($point),2)
 $title=[System.Text.StringBuilder]::new(512); [void][OmylaInput]::GetWindowText($window,$title,512)
 $pidValue=[uint32]0; [void][OmylaInput]::GetWindowThreadProcessId($window,[ref]$pidValue)
 $processName=(Get-Process -Id $pidValue -ErrorAction Stop).ProcessName
 $element=[System.Windows.Automation.AutomationElement]::FromPoint([System.Windows.Point]::new([double]$request.x,[double]$request.y))
 if ($request.kind -in @('type','key')) { $element=[System.Windows.Automation.AutomationElement]::FocusedElement; $window=[OmylaInput]::GetForegroundWindow(); $title=[System.Text.StringBuilder]::new(512);[void][OmylaInput]::GetWindowText($window,$title,512);[void][OmylaInput]::GetWindowThreadProcessId($window,[ref]$pidValue);$processName=(Get-Process -Id $pidValue).ProcessName }
 if ($null -eq $element) { throw 'no_target' }
 $current=$element.Current
 if($request.kind -in @('type','key')) {
  $rectangle=$current.BoundingRectangle
  if($rectangle.IsEmpty -or [double]$request.x -lt $rectangle.Left -or [double]$request.x -gt $rectangle.Right -or [double]$request.y -lt $rectangle.Top -or [double]$request.y -gt $rectangle.Bottom){throw 'focused_target_outside_observation'}
 }
 @{ windowId=$window.ToInt64().ToString(); title=$title.ToString(); process=$processName; name=$current.Name; controlType=$current.ControlType.ProgrammaticName; password=$current.IsPassword; editable=($current.ControlType -eq [System.Windows.Automation.ControlType]::Edit -or ($current.ControlType -eq [System.Windows.Automation.ControlType]::Document -and $processName -match '^(notepad|wordpad|winword)$')) }
}
$target=Inspect-Target
if ($request.operation -eq 'inspect') { $target | ConvertTo-Json -Compress; exit }
if ($request.operation -ne 'execute') { throw 'invalid_operation' }
if ($target.windowId -ne $request.windowId -or $target.name -ne $request.name -or $target.controlType -ne $request.controlType -or $target.password -or $target.process -match 'powershell|cmd|terminal|pwsh|regedit|taskmgr|credential|consent') { throw 'target_changed' }
foreach ($key in @(16,17,18,91,92)) { if (([OmylaInput]::GetAsyncKeyState($key) -band 0x8000) -ne 0) { throw 'modifier_pressed' } }
switch ($request.kind) {
 'click' { if(-not [OmylaInput]::SetPhysicalCursorPos([int]$request.x,[int]$request.y)){throw 'cursor_failed'};[OmylaInput]::Click($false) }
 'double_click' { if(-not [OmylaInput]::SetPhysicalCursorPos([int]$request.x,[int]$request.y)){throw 'cursor_failed'};[OmylaInput]::Click($true) }
 'type' { if(-not $target.editable -or $request.text.Length -gt 2000){throw 'invalid_text'};[OmylaInput]::Type($request.text) }
 'scroll' { if([math]::Abs([int]$request.amount) -gt 5){throw 'invalid_scroll'};if(-not [OmylaInput]::SetPhysicalCursorPos([int]$request.x,[int]$request.y)){throw 'cursor_failed'};[OmylaInput]::Scroll([int]$request.amount) }
 'key' {
  switch ($request.key) {
   'TAB' {[OmylaInput]::Keys(9,0)} 'ENTER' {[OmylaInput]::Keys(13,0)} 'ESC' {[OmylaInput]::Keys(27,0)}
   'CTRL+A' {[OmylaInput]::Keys(17,65)} 'CTRL+C' {[OmylaInput]::Keys(17,67)} 'CTRL+V' {[OmylaInput]::Keys(17,86)}
   'CTRL+S' {[OmylaInput]::Keys(17,83)} 'CTRL+F' {[OmylaInput]::Keys(17,70)} 'CTRL+L' {[OmylaInput]::Keys(17,76)}
   'ALT+LEFT' {[OmylaInput]::Keys(18,37)} default {throw 'invalid_key'}
  }
 }
 default {throw 'invalid_action'}
}
@{ delivered=$true } | ConvertTo-Json -Compress
