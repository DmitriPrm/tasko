import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/shared/lib/theming/theme";
import "@/assets/styles/index.scss";
import "@/shared/api/apply-interceptors";

import ElementPlus from "element-plus";
import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "@/app/App.vue";
import { router } from "@/app/providers/router";
import { i18n } from "@/shared/lib/theming/i18n/translate";
import BaseAvatar from "@/shared/ui/avatar/BaseAvatar.vue";
import BaseButton from "@/shared/ui/button/BaseButton.vue";
import BaseFlex from "@/shared/ui/flex/BaseFlex.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(ElementPlus, { locale: undefined });
app.component("BaseFlex", BaseFlex);
app.component("BaseButton", BaseButton);
app.component("BaseAvatar", BaseAvatar);
app.component("BaseTable", BaseTable);
app.mount("#app");
