import {
	createApp
} from 'vue'

import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/lib/locale/lang/zh-cn'
// import ElTableChen from "./libs/el-table-chen";
import ElTableChen from "../lib/el-table-chen";
import '../lib/style.css'

import App from './example/App.vue'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component)
}
app.use(ElementPlus, {
	zhCn
})
app.use(ElTableChen, {
	containerId: 'app', // 全局配置容器id
	responseFn: function (res) { // 全局ajax请求成功后的回调函数，可不配置
		this.dataSource.length = 0;
		if (res && res.data && Array.isArray(res.data)) {
			this.dataSource.splice(0, 0, ...(res.data || []));
			this.total = dataSource.length;
		} else {
			this.dataSource.splice(
				0,
				0,
				...(res && res.data && res.data.list ? res.data.list : [])
			);
			this.total = res.data.totalCount;
		}
		// 如果数据为空并且当前页码大于1,则页码减一重新获取数据
		this.againGetData();
	}
})

app.mount('#app')