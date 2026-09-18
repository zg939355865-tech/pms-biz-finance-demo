$ErrorActionPreference = 'Stop'
$tmp = $PSScriptRoot
$entries = @(
  @{ outputSlide=1; sourceSlide=1; narrativeRole='opening title'; ids=@('sh/7qp4be9c','sh/65g3298r') },
  @{ outputSlide=2; sourceSlide=2; narrativeRole='agenda and shared framing'; ids=@('sh/9072xkry','sh/ozy1ofad','tb/sjil0vu9','sh/a10jqpsj') },
  @{ outputSlide=3; sourceSlide=8; narrativeRole='business value and alignment'; ids=@('sh/983ap0ru','sh/87atgfq9','sh/g72x4zyd','sh/ri9g7uhw','sh/98rehwve','sh/n6pwfmd8','sh/0jydkreh','sh/jq5w365o','sh/6h0fypgb') },
  @{ outputSlide=4; sourceSlide=10; narrativeRole='functional landscape'; ids=@('sh/l8z690ji','sh/k7q50v2x','sh/725onyl4','sh/s7yt4b21','sh/cbu58j2h','sh/ydcnatkn','sh/l036l83y','sh/d87uxg3m') },
  @{ outputSlide=5; sourceSlide=14; narrativeRole='end to end business finance chain'; ids=@('sh/y5wjitgj','sh/jepwf2pc','sh/x4ni9ofy','sh/z650byxo','sh/0buh8zy5','sh/ehwvat8n','sh/b2507exs','sh/kre1k3y9','sh/kfidonqx') },
  @{ outputSlide=6; sourceSlide=13; narrativeRole='project lifecycle capability'; ids=@('sh/i1czm1oj','sh/j2l0f6p4','sh/vaxg7ulo','sh/876xwfmx','sh/7mdg3als','sh/6l4fu547','sh/lkvy103m','sh/kjmxsfm1','sh/cnqh8fux','sh/xozyhkbi','sh/bq9orito','sh/q50nydsj') },
  @{ outputSlide=7; sourceSlide=11; narrativeRole='core financial controls'; ids=@('sh/ofqtgnyt','sh/xcryxg7y','sh/9gza9sze','sh/wbih4b6d','sh/n69grmpw','sh/250zy18b','sh/98rytw72') },
  @{ outputSlide=8; sourceSlide=4; narrativeRole='collaboration monitoring and analytics'; ids=@('sh/p0rel8vu','sh/ozydc3u9','sh/rm1k7yt4','sh/sna103ap','sh/1cj2d8b6') },
  @{ outputSlide=9; sourceSlide=9; narrativeRole='implementation principles'; ids=@('sh/94zaxgfa','sh/83qtobep','sh/cnu1kzyd','tb/2x0ne10r','sh/0b65obm9') },
  @{ outputSlide=10; sourceSlide=14; narrativeRole='delivery roadmap'; ids=@('sh/jepwf2pc','sh/x4ni9ofy','sh/ehwvat8n','sh/b2507exs','sh/kre1k3y9','sh/y5wjitgj','sh/z650byxo','sh/0buh8zy5','sh/kfidonqx') },
  @{ outputSlide=11; sourceSlide=23; narrativeRole='immediate action items'; ids=@('sh/fuhsnq5s','sh/ut8bul4n','sh/pkjut03a','sh/4jat0fmp','sh/8filc3yx','sh/90vqdczq') },
  @{ outputSlide=12; sourceSlide=24; narrativeRole='closing'; ids=@('sh/nux8zidc','sh/2to76dcr') }
)
$output = foreach ($e in $entries) {
  $targets = foreach ($id in $e.ids) {
    $action = if ($id -match 'Footer|a10jqpsj|6h0fypgb|d87uxg3m|q50nydsj|98rytw72|1cj2d8b6|0b65obm9|kfidonqx|90vqdczq') { 'delete' } else { 'rewrite' }
    @{ shapeId=$id; action=$action }
  }
  @{ outputSlide=$e.outputSlide; sourceSlide=$e.sourceSlide; narrativeRole=$e.narrativeRole; reuseMode='duplicate-slide'; editTargets=$targets }
}
$used = $entries.sourceSlide | Sort-Object -Unique
$omitted = 1..24 | Where-Object { $_ -notin $used } | ForEach-Object { @{sourceSlide=$_; reason='Layout pattern not required for this concise functional introduction'} }
$json = @{outputSlides=$output; omittedSourceSlides=$omitted} | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText("$tmp\template-frame-map.json", $json, [System.Text.UTF8Encoding]::new($false))
