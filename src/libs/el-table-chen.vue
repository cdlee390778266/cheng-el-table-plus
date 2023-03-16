<template>
  <div v-loading="isLoading">
    <div class="dflex">
      <div
        class="flex"
        :style="`padding-right: ${toggleConfig.show ? '10px' : 0}`"
      >
        <slot name="header" :$data="$data"></slot>
      </div>
      <div
        v-if="toggleConfig.show"
        class="handle-icons"
        :class="toggleConfig.tgClass"
      >
        <el-icon
          v-show="showType === 'card'"
          title="列表展示"
          v-html="toggleConfig.tableSvgIcon || deafultTableSvgIcon"
          @click="
            showType = 'table';
            toggleRowSelection();
          "
        ></el-icon>
        <el-icon
          title="卡片展示"
          v-show="showType === 'table'"
          v-html="toggleConfig.cardSvgIcon || deafultCardSvgIcon"
          @click="showType = 'card'"
        ></el-icon>
      </div>
    </div>
    <el-config-provider :locale="locale">
      <div class="chen-table-wrapper">
        <!-- 表格布局 -->
        <el-table
          v-if="columnsConfig.length && showType === 'table'"
          ref="chenTable"
          :data="dataSource"
          :height="noDefaultHeight ? null : maxHeight"
          :maxHeight="maxTableHeight || maxHeight"
          :rowKey="rowKey"
          :class="{ hideCheckAll: single }"
          :highlight-current-row="currentRow"
          headerRowClassName="text-left"
          border
          fit
          stripe
          class="chen-table"
          @select="selectionChange"
          @select-all="selectionChange"
          v-bind="{ ...tableConfig, ...$attrs }"
        >
          <el-table-column
            v-if="selection"
            type="selection"
            width="55"
            align="center"
            fixed="left"
          >
          </el-table-column>
          <el-table-column
            v-for="(column, index) in tableColumnsConfig"
            :key="index"
            show-overflow-tooltip
            v-bind="column"
          >
            <template #default="scope">
              <slot
                v-if="column.slotName"
                :name="column.slotName"
                :scope="scope"
              ></slot>
              <div v-else>
                {{ scope.row[column.prop] }}
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <div>
              <slot v-if="emptySlotName" :name="emptySlotName" />
              <el-empty v-else description="暂无数据"></el-empty>
            </div>
          </template>
        </el-table>
        <!-- 卡片布局 -->
        <el-row
          v-if="showType === 'card'"
          class="card-wrapper"
          :gutter="20"
          :style="`height: ${noDefaultHeight ? 'auto' : maxHeight + 'px'}`"
        >
          <template v-if="dataSource.length">
            <el-col
              v-bind="cardConfig.grid || defaultCardGrid"
              v-for="(item, index) in dataSource"
              :key="index"
            >
              <div class="card-main" @click="selectionCardChange(item)">
                <slot
                  v-if="cardConfig && cardConfig.slotName"
                  :name="cardConfig.slotName"
                  :scope="{ row: item }"
                ></slot>
                <el-card v-else style="width: 100%">
                  <div class="dflex">
                    <div class="flex ellipsis">
                      <h4 class="ellipsis">
                        <span :title="item.name">{{ item.name }}</span>
                      </h4>
                      <div
                        v-for="(column, index) in cardColumnsConfig"
                        :key="index"
                      >
                        <div v-if="column.slotName">
                          <div class="dflex ellipsis">
                            <strong>{{ column.label }}：</strong>
                            <div class="flex ellipsis">
                              <slot
                                :name="column.slotName"
                                :scope="{ row: item }"
                              ></slot>
                            </div>
                          </div>
                        </div>
                        <div class="dflex ellipsis" v-else>
                          <strong>{{ column.label }}：</strong>
                          <span
                            class="flex ellipsis"
                            :title="item[column.prop]"
                            >{{ item[column.prop] }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="handle" v-if="handleConfig" @click.stop>
                    <slot
                      :name="handleConfig.slotName"
                      :scope="{ row: item }"
                    ></slot>
                  </div>
                  <el-icon
                    v-if="multipleSelection.includes(item)"
                    class="el-icon-check"
                    ><SuccessFilled
                  /></el-icon>
                </el-card>
              </div>
            </el-col>
          </template>
          <template v-else>
            <el-col :span="24" v-if="cardConfig.emptySlotName">
              <slot :name="handleConfig.slotName" :scope="{ row: item }"></slot>
            </el-col>
            <el-col :span="24" v-else>
              <slot v-if="emptySlotName" :name="emptySlotName" />
              <el-empty v-else description="暂无数据"></el-empty>
            </el-col>
          </template>
        </el-row>
      </div>
      <div class="pagination-wrapper" v-if="pagination">
        <el-pagination
          background
          :layout="pageLayout"
          :page-sizes="pager.pageSizes"
          v-model:page-size="pager.defaultPageSize"
          v-model:current-page="pager.currentPage"
          :total="total"
          @current-change="() => (apiFn ? getData() : goWebPage())"
          @size-change="() => (apiFn ? getData() : goWebPage())"
        >
        </el-pagination>
      </div>
    </el-config-provider>
  </div>
</template>

<script setup>
import {
  defineProps,
  ref,
  reactive,
  watch,
  nextTick,
  computed,
  onMounted,
  onUnmounted,
  onUpdated,
  getCurrentInstance,
  inject,
  defineExpose,
} from "vue";
import zhCn from "element-plus/dist/locale/zh-cn.mjs";
import en from "element-plus/dist/locale/en.mjs";

const props = defineProps({
  type: {
    //表格呈现类型  card(卡片) or table(表格)
    type: String,
    default: "table",
  },
  toggleConfig: {
    // 切换配置
    type: Object,
    default: () => ({
      show: false, //是否显示
      tableIconClass: "", //表格图标类名
      cardIconClass: "", //卡片图标类名
      tgClass: "", // 容器类名
    }),
  },
  apiFn: {
    // 远程获取数据函数，如果apiFn不为空，则调用此函数，否则数据表格数据直接读取tableData属性
    type: Function,
    default: null,
  },
  responseFn: {
    type: Function,
    default: null,
  },
  tableData: {
    // 数据
    type: Array,
    default: null,
  },
  autoGetData: {
    // 是否自动加载数据
    type: Boolean,
    default: true,
  },
  currentRow: {
    // 选中行是否高亮
    type: Boolean,
    default: false,
  },
  query: {
    // 查询条件，字符串或者对象a=b&c=d、{a:b}
    type: [String, Object],
    default: "",
  },
  tableConfig: {
    // 表格配置，同el-table表格属性配置https://element.eleme.cn/#/zh-CN/component/table#table-attributes
    type: Object,
    default: () => {},
  },
  columnsConfig: {
    // 表格列配置，同el-table-column配置https://element.eleme.cn/#/zh-CN/component/table#table-attributes；增加slotName属性，如果存在，则优先使用插槽名为slotName属性值的数据
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: String,
    default: "id",
  },
  selection: {
    // 是否显示多选框
    type: Boolean,
    default: false,
  },
  single: {
    // 是否是单选
    type: Boolean,
    default: false,
  },
  pagination: {
    // 是否有分页
    type: Boolean,
    default: true,
  },
  pageSizes: {
    // 分页配置
    type: Array,
    default: () => [10, 20, 50],
  },
  defaultPageSize: {
    // 默认分页大小
    type: Number,
    default: 10,
  },
  pageLayout: {
    // 分页布局
    type: String,
    default: "total, sizes, prev, pager, next, jumper",
  },
  containerId: {
    // 组件容器id
    type: String,
    default: "",
  },
  autoHeight: {
    // 自适应高度
    type: Boolean,
    default: true,
  },
  offsetHeight: {
    // 高度偏移,值越大组件高度越小
    type: Number,
    default: 70,
  },
  minHeight: {
    // 表格最小高度
    type: Number,
    default: 200,
  },
  noDefaultHeight: {
    // 是否没有默认高度，没有数据或则数据少的时候的默认高度
    type: Boolean,
    default: false,
  },
  maxTableHeight: {
    // 表格最大高度
    type: Number,
    default: 1000000000000,
  },
  defaultSelectionKeys: {
    // 默认选中id数组
    type: Array,
    default: () => [],
  },
  cardConfig: {
    // 卡片配置
    type: Object,
    default: () => ({
      slotName: "", // 插槽名字
      emptySlotName: "",
      grid: {
        xs: 24,
        sm: 12,
        md: 12,
        lg: 8,
      },
    }),
  },
  finishCallBack: {
    // 获取数据完成后的回调
    type: Function,
    default: () => {},
  },
  emptySlotName: {
    // 没有数据插槽名
    type: String,
    default: "",
  },
  language: {
    // 语言
    type: String,
    default: "zh-cn",
    validator(value) {
      return ["zh-cn", "en"].includes(value);
    },
  },
  changePageKeepSelection: {
    // 只支持前端分页的情况（即apiFn不存在）
    // 切换分页是否保持上一页的选中
    type: Boolean,
    default: false,
  },
  pageKey: {
    // 页码键名
    type: String,
    default: "",
  },
  pageSizeKey: {
    // 分页键名
    type: String,
    default: "",
  },
});

let deafultTableSvgIcon = ref(
  `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-029747aa=""><path fill="currentColor" d="M160 448a32 32 0 0 1-32-32V160.064a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V416a32 32 0 0 1-32 32H160zm448 0a32 32 0 0 1-32-32V160.064a32 32 0 0 1 32-32h255.936a32 32 0 0 1 32 32V416a32 32 0 0 1-32 32H608zM160 896a32 32 0 0 1-32-32V608a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32v256a32 32 0 0 1-32 32H160zm448 0a32 32 0 0 1-32-32V608a32 32 0 0 1 32-32h255.936a32 32 0 0 1 32 32v256a32 32 0 0 1-32 32H608z"></path></svg>`
); //表格图标类名
let deafultCardSvgIcon = ref(
  `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-029747aa=""><path fill="currentColor" d="M389.44 768a96.064 96.064 0 0 1 181.12 0H896v64H570.56a96.064 96.064 0 0 1-181.12 0H128v-64h261.44zm192-288a96.064 96.064 0 0 1 181.12 0H896v64H762.56a96.064 96.064 0 0 1-181.12 0H128v-64h453.44zm-320-288a96.064 96.064 0 0 1 181.12 0H896v64H442.56a96.064 96.064 0 0 1-181.12 0H128v-64h133.44z"></path></svg>`
); //卡片图标类名
let isLoading = ref(false);
let isLoaded = ref(false);
let maxHeight = ref(600);
let showType = ref("table");
let multipleSelection = reactive([]);
let dataSource = reactive([]);
let total = ref(0);
let pager = reactive({
  pageSizes: props.pageSizes,
  defaultPageSize: props.defaultPageSize,
  currentPage: 1,
});
const chenTable = ref(null);
const instance = getCurrentInstance();
const elTableChenOptions = inject("elTableChenOptions");

let handleConfig = reactive({});
let defaultCardGrid = reactive({
  xs: 24,
  sm: 12,
  md: 12,
  lg: 8,
});
watch(
  () => props.columnsConfig,
  () => {
    handleConfig = props.columnsConfig.find(
      (item) =>
        (item.props === "handle" || item.slotName === "handle") && !item.hidden
    );
  },
  { deep: true, immediate: true }
);
watch(
  () => props.tableData,
  () => {
    isLoaded.value = false;
    multipleSelection.length = 0;
    goWebPage();
  },
  { deep: true, immediate: true }
);
watch(dataSource, () => {
  if (!props.changePageKeepSelection || props.apiFn) {
    multipleSelection.length = 0;
    if (props.defaultSelectionKeys && props.defaultSelectionKeys.length) {
      setDefaultSelection();
    }
  } else {
    if (!isLoaded.value) {
      if (props.defaultSelectionIds && props.defaultSelectionIds.length) {
        setDefaultSelection();
      }
      isLoaded.value = true;
    } else {
      setSelection();
    }
  }
});
watch(
  () => props.defaultSelectionKeys,
  () => {
    multipleSelection.length = 0;
    chenTable.value?.clearSelection();
    if (props.defaultSelectionKeys && props.defaultSelectionKeys.length) {
      setDefaultSelection();
    }
  }
);
watch(
  () => props.autoHeight,
  () => {
    if (props.autoHeight) {
      updateHeight();
    } else {
      removeEventListener();
    }
  },
  { immediate: true }
);
watch(
  () => props.noDefaultHeight,
  () => {
    nextTick(() => {
      doLayout();
    });
  }
);

const locale = computed(() => (props.language === "zh-cn" ? zhCn : en));
const tableColumnsConfig = computed(() => {
  return props.columnsConfig.filter((column) => !column.hidden);
});
const cardColumnsConfig = computed(() => {
  return props.columnsConfig.filter(
    (column) =>
      !column.hidden && column.prop != "handle" && column.slotName != "handle"
  );
});

// 请求参数格式化
function formatQuery(query) {
  let data = "";
  if (typeof query === "string") {
    let arr = query.split("?")[1].split("&");
    arr.forEach((str, index) => {
      let arr1 = str.split("=");
      let key = arr1[0];
      let value = arr1[1] || arr1[1] == 0 ? arr1[1] : "";
      if (index == 0) {
        data += `?${key}=${encodeURI(value)}`;
      } else {
        data += `&${key}=${encodeURI(value)}`;
      }
    });
  } else {
    data = query || {};
  }
  return data;
}
// 远程获取数据
function getData() {
  if (props.apiFn) {
    isLoading.value = true;
    let query = null;
    if (typeof props.query === "string") {
      query = `?${props.pageKey || elTableChenOptions.pageKey || "page"}=${
        pager.currentPage
      }&${props.pageSizeKey || elTableChenOptions.pageSizeKey || "size"}=${
        pager.defaultPageSize
      }${props.query ? "&" + props.query : ""}`;
    } else {
      query = {
        ...props.query,
        [props.pageKey || elTableChenOptions.pageKey || "page"]:
          pager.currentPage,
        [props.pageSizeKey || elTableChenOptions.pageSizeKey || "size"]:
          pager.defaultPageSize,
      };
    }

    query = formatQuery(query);

    props
      .apiFn(query)
      .then((res) => {
        isLoading.value = false;

        let responseFn =
          props.responseFn && typeof props.responseFn == "function"
            ? props.responseFn
            : elTableChenOptions.responseFn &&
              typeof elTableChenOptions.responseFn == "function"
            ? elTableChenOptions.responseFn
            : defaultResponseFn;

        responseFn.call({ dataSource, total, againGetData }, res);
        props.finishCallBack(dataSource);
      })
      .catch(() => {
        isLoading.value = false;
      });
  }
}
function defaultResponseFn(res) {
  dataSource.length = 0;
  if (res && res.data && Array.isArray(res.data)) {
    dataSource.splice(0, 0, ...(res.data || []));
    total.value = dataSource.length;
  } else {
    dataSource.splice(
      0,
      0,
      ...(res && res.data && res.data.list ? res.data.list : [])
    );
    total.value = res.data.totalCount;
  }
  againGetData();
}
// 如果数据为空并且当前页码大于1,则页码减一重新获取数据
function againGetData() {
  if (!dataSource.length && pager.currentPage > 1) {
    pager.currentPage = pager.currentPage - 1;
    getData();
  }
}
// 前端分页
function goWebPage() {
  if (props.tableData) {
    total.value = props.tableData.length;
    dataSource.length = 0;
    if (props.pagination) {
      let start = (pager.currentPage - 1) * pager.defaultPageSize;
      let end = start + pager.defaultPageSize;
      dataSource.splice(0, 0, ...props.tableData.slice(start, end));
      if (props.tableData.length && !dataSource.length) {
        start = (pager.currentPage - 2) * pager.defaultPageSize;
        dataSource.splice(0, 0, ...props.tableData.slice(start, end));
      }
    } else {
      dataSource.splice(0, 0, ...(props.tableData || []));
    }
  }
}
// 设置默认选中
function setDefaultSelection() {
  nextTick(() => {
    props.defaultSelectionKeys.forEach((rowKey) => {
      let row = dataSource.find((row) => row[props.rowKey] === rowKey);
      if (row) {
        multipleSelection.push(row);
      }
    });
    toggleRowSelection();
  });
}
// 设置选中
function setSelection() {
  nextTick(() => {
    if (props.changePageKeepSelection && !props.apiFn) {
      dataSource.forEach((row) => {
        if (
          multipleSelection.find(
            (item) => item[props.rowKey] == row[props.rowKey]
          )
        ) {
          chenTable.value?.toggleRowSelection(row, true);
        }
      });
    }
  });
}
function toggleRowSelection() {
  nextTick(() => {
    chenTable.value &&
      multipleSelection.map((item) => {
        let row = dataSource.find(
          (row) => row[props.rowKey] === item[props.rowKey]
        );
        if (row) {
          chenTable.value.toggleRowSelection(row, true);
        }
      });
  });
}
function selectionCardChange(row) {
  let rowIndex = multipleSelection.findIndex(
    (item) => item[props.rowKey] === row[props.rowKey]
  );

  if (rowIndex > -1) {
    multipleSelection.splice(rowIndex, 1);
  } else {
    multipleSelection.push(row);
  }
  selectionChange(multipleSelection, row);
}
// 多选
function selectionChange(multipleSelections, row) {
  multipleSelections = [...multipleSelections];
  if (props.single) {
    // 单选
    multipleSelection.length = 0;
    let isSelectCurrentRow = false;
    multipleSelections.forEach((item) => {
      if (item[props.rowKey] === row[props.rowKey]) {
        isSelectCurrentRow = true;
      } else {
        chenTable.value?.toggleRowSelection(item, false);
      }
    });
    // console.log(multipleSelection, 88, row, isSelectCurrentRow);
    // return;
    if (isSelectCurrentRow) {
      multipleSelection.splice(0, 0, row);
    }
  } else {
    if (props.changePageKeepSelection) {
      dataSource.forEach((row) => {
        let isSelection = !!multipleSelections.find(
          (item) => item[props.rowKey] == row[props.rowKey]
        );
        let isExistence = multipleSelection.includes(row);
        if (isSelection) {
          if (!isExistence) {
            multipleSelection.push(row);
          }
        } else {
          if (isExistence) {
            multipleSelection.length = 0;
            multipleSelection.splice(
              0,
              0,
              ...multipleSelection.filter(
                (item) => item[props.rowKey] != row[props.rowKey]
              )
            );
          }
        }
      });
    } else {
      multipleSelection.length = 0;
      multipleSelection.splice(0, 0, ...multipleSelections);
    }
  }
}
// 刷新
function refresh() {
  pager.currentPage = 1;
  getData();
}
// 重绘表格
function doLayout() {
  nextTick(() => {
    chenTable.value?.doLayout();
    instance.ctx.$forceUpdate();
  });
}
// 取得组件data里某个属性的数据，暴露给父级组件使用
function getComponentData(key) {
  return key ? instance.ctx.$.setupState[key] : null;
}
// 设置表格最大高度
function setMaxHeight() {
  let containerId = props.containerId || elTableChenOptions.containerId;
  if (!containerId || !document.getElementById(containerId)) return;

  let minusSelectors = [".header"];
  if (props.pagination) minusSelectors.push("el-pagination");
  maxHeight.value = getTableMaxHeight(
    minusSelectors,
    props.offsetHeight,
    `#${containerId}`
  );
}
// 拿到表格的高度和最高高度 高度===最高高度
function getTableMaxHeight(
  minusSelectors,
  minusHeight = 100,
  containerSelector = props.containerId,
  minHeight = props.minHeight
) {
  let [container, minusHeightTotal] = [
    document.querySelector(containerSelector),
    minusHeight,
  ];
  if (!container) return minHeight;

  let [boxHeight, maxHeight] = [container.clientHeight, 0];

  if (navigator.userAgent.includes("Firefox")) minusHeightTotal += 20;
  for (let selector of minusSelectors) {
    container.querySelector(selector) &&
      (minusHeightTotal += container.querySelector(selector).clientHeight);
  }
  maxHeight = boxHeight - minusHeightTotal;
  return maxHeight > minHeight ? maxHeight : minHeight;
}
function updateHeight() {
  if (props.autoHeight) {
    setMaxHeight();
    window.addEventListener("resize", setMaxHeight);
  }
}
function removeEventListener() {
  window.removeEventListener("resize", setMaxHeight);
}

onMounted(() => {
  if (props.apiFn && props.autoGetData) {
    getData();
  } else {
    multipleSelection.length = 0;
    dataSource.splice(0, 0, ...(props.tableData || []));
    goWebPage();
  }
  showType.value = props.type;
});
onUnmounted(() => {
  removeEventListener();
});
onUpdated(() => {
  updateHeight();
});

defineExpose({ getComponentData, refresh, doLayout, againGetData });
</script>

<style lang="less" scoped>
.dflex {
  display: flex;
}
.flex {
  flex: 1;
}
.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  -o-text-overflow: ellipsis;
  word-break: break-all;
}
.chen-table-wrapper {
  width: 100%;
}

.chen-table {
  width: 100%;
  td {
    .el-tooltip > div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      -o-text-overflow: ellipsis;
      word-break: break-all;
    }
  }
}

.hideCheckAll :deep(th.el-table-column--selection > .cell) {
  display: none !important;
}

.pagination-wrapper {
  text-align: right;
  margin-top: 20px;
}

.el-pagination {
  display: inline-flex;
}

.el-pagination.is-background .btn-next,
.el-pagination.is-background .btn-prev,
.el-pagination.is-background .el-pager li {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.el-pagination.is-background .btn-next,
.el-pagination.is-background .btn-prev {
  padding-left: 5px;
  padding-right: 5px;
}
.el-pagination.is-background .el-pager li:not(.disabled).active {
  background: #fff;
  border: 1px solid #2d8cf0;
  color: #2d8cf0;
}
.el-pagination.is-background .btn-next.disabled,
.el-pagination.is-background .btn-next:disabled,
.el-pagination.is-background .btn-prev.disabled,
.el-pagination.is-background .btn-prev:disabled,
.el-pagination.is-background .el-pager li.disabled {
  border: 1px solid #ddd;
  background: #f7f9fc;
  color: #8f9bb2;
}
.el-pagination.is-background,
.el-pagination__total,
.el-pagination.is-background .btn-next,
.el-pagination.is-background .btn-prev,
.el-pagination.is-background .el-pager li,
.el-pagination__jump {
  color: #282b2e;
}
.handle-icons {
  // padding-top: 16px;
  i {
    font-size: 30px;
    color: #818a90;
    cursor: pointer;
    &:hover {
      color: rgba(0, 117, 201, 0.85);
    }
  }
}
.card-wrapper {
  font-size: 14px;
  line-height: 26px;
  overflow-y: auto;
  text-align: left;
  .card-main {
    position: relative;
  }
  h4 {
    padding: 0 0 10px 0;
    margin: 0 0 10px 0;
    text-align: left;
    font-size: 16px;
    border-bottom: 1px solid #ddd;
  }
  strong {
    display: block;
  }
  :deep(.el-col) {
    margin-bottom: 15px;
  }
  .handle {
    margin-top: 10px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    :deep(.el-button) {
      padding-top: 0;
      padding-bottom: 0;
    }
  }
  :deep(.el-icon-check) {
    position: absolute;
    top: 8px;
    right: 3px;
    font-size: 20px;
    color: #67c23a;
  }
  .card-empty {
    line-height: 200px;
    text-align: center;
    color: #999;
    font-size: 16px;
  }
}
.el-tooltip__popper {
  max-width: 600px;
  white-space: normal !important;
  line-height: 20px;
}
</style>
