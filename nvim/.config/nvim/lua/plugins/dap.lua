return {
  "mfussenegger/nvim-dap",
  opts = function(_, opts)
    local dap = require("dap")
    table.insert(dap.configurations.go, {
      type = "go",
      name = "Attach: dlv :40000",
      request = "attach",
      mode = "remote",
      host = "127.0.0.1",
      port = 40000,
    })
  end,
}
