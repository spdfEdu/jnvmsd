# Dot-source this file before npm commands: . ./use-d-drive.ps1
$env:npm_config_cache = 'D:/jnvmsd-tools/npm-cache'
$env:TEMP = 'D:/jnvmsd-tools/tmp'
$env:TMP = 'D:/jnvmsd-tools/tmp'
$env:WRANGLER_LOG_PATH = 'D:/jnvmsd-tools/wrangler'
$env:WRANGLER_SEND_METRICS = 'false'
$env:XDG_CONFIG_HOME = 'D:/jnvmsd-tools/config'
New-Item -ItemType Directory -Path $env:npm_config_cache,$env:TEMP,$env:WRANGLER_LOG_PATH,$env:XDG_CONFIG_HOME -Force | Out-Null
