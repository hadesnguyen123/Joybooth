$msiPath = "f:\JoyBooth\desktop\resources\drivers\EOSWebcamUtility\EOS Webcam Utility.msi"
$driverDir = "f:\JoyBooth\desktop\resources\drivers\EOSWebcamUtility"
$logPath = "f:\JoyBooth\desktop\resources\drivers\EOSWebcamUtility\install.log"

Write-Host "Installing Canon EOS Webcam Utility with Administrator privileges..."
$argList = "/i `"$msiPath`" SETUPEXEDIR=`"$driverDir`" /qn /norestart /l*v `"$logPath`""
$proc = Start-Process msiexec.exe -ArgumentList $argList -Verb RunAs -Wait -PassThru

Write-Host "ExitCode: $($proc.ExitCode)"
if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
    Write-Host "SUCCESS"
} else {
    Write-Host "FAILED"
}
