function Get-ExcelContent {
    param([string]$filePath)
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Open($filePath)
    $results = @{}

    foreach ($sheet in $workbook.Worksheets) {
        $name = $sheet.Name
        $usedRange = $sheet.UsedRange
        $rowCount = $usedRange.Rows.Count
        $colCount = $usedRange.Columns.Count
        $data = @()
        
        $headers = @()
        for ($c = 1; $c -le $colCount; $c++) {
            $headers += $usedRange.Cells.Item(1, $c).Text
        }

        for ($r = 2; $r -le $rowCount; $r++) {
            $obj = [ordered]@{}
            for ($c = 1; $c -le $colCount; $c++) {
                $obj[$headers[$c-1]] = $usedRange.Cells.Item($r, $c).Text
            }
            $data += $obj
        }
        $results[$name] = $data
    }

    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    return $results
}

$files = @(
    "Talent Development for ALL @ SAJC_Students_Heatmap.xlsx",
    "Talent Development for ALL @ SAJC_Teachers_Heatmap.xlsx"
)

$finalResults = @{}
foreach ($f in $files) {
    $path = Join-Path (Get-Location) $f
    $finalResults[$f] = Get-ExcelContent -filePath $path
}

$finalResults | ConvertTo-Json -Depth 5
