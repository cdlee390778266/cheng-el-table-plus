import ElTableChen from "./el-table-chen.vue";

ElTableChen.install = function (app, options = {}) {
  app.provide('elTableChenOptions', options)
  app.component('ElTableChen', ElTableChen)
}

export default ElTableChen