$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$rootWithSeparator = $root + [IO.Path]::DirectorySeparatorChar
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:8765/')

$contentTypes = @{
    '.css' = 'text/css; charset=utf-8'
    '.html' = 'text/html; charset=utf-8'
    '.ico' = 'image/x-icon'
    '.js' = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png' = 'image/png'
    '.svg' = 'image/svg+xml'
}

try {
    $listener.Start()
    Write-Host 'Sistem berjalan di http://localhost:8765/frontend/html/index.html'
    Write-Host 'Tekan Ctrl+C untuk menghentikan server.'
    Start-Process 'http://localhost:8765/frontend/html/index.html'

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response

        try {
            $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($relativePath)) {
                $relativePath = 'frontend/html/index.html'
            }

            $filePath = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
            if (-not $filePath.StartsWith($rootWithSeparator, [StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                continue
            }

            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $response.StatusCode = 404
                continue
            }

            $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
            if ($contentTypes.ContainsKey($extension)) {
                $response.ContentType = $contentTypes[$extension]
            }

            $bytes = [IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        catch {
            $response.StatusCode = 500
            Write-Host "Gagal memuat $($context.Request.Url.AbsolutePath): $_"
        }
        finally {
            $response.Close()
        }
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}