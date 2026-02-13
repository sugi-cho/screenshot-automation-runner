param(
  [Parameter(Mandatory = $true)]
  [string]$Repo
)

$ErrorActionPreference = "Stop"

$items = @(
  @{ Title = "MVP-1: Bootstrap + Config Validation"; File = "issues/01-bootstrap-and-config-validation.md" },
  @{ Title = "MVP-2: Process Launcher + Adapter"; File = "issues/02-process-launcher-and-adapter.md" },
  @{ Title = "MVP-3: Step Engine Core"; File = "issues/03-step-engine-core.md" },
  @{ Title = "MVP-4: Run Command + Artifacts"; File = "issues/04-run-command-and-artifacts.md" },
  @{ Title = "MVP-5: Tests + Sample Config"; File = "issues/05-tests-and-sample-config.md" },
  @{ Title = "MVP-6: GitHub Actions + Docs"; File = "issues/06-github-actions-and-docs.md" }
)

foreach ($item in $items) {
  $body = Get-Content $item.File -Raw -Encoding UTF8
  $output = gh issue create --repo $Repo --title $item.Title --body $body 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Issue作成失敗: $($item.Title)`n$output"
  }
  Write-Host "Created: $($item.Title)"
}
