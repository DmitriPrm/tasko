import ConfirmDialog from "@/shared/ui/dialog/ConfirmDialog.vue";
import { openDialog } from "@/shared/lib/dialog/dialog";
import { translate } from "@/shared/lib/theming/i18n/translate";

export function openConfirm(options?: { title?: string; text?: string }) {
	return openDialog<boolean>(ConfirmDialog, {
		title: options?.title ?? translate("common.areYouSure"),
		text: options?.text ?? translate("common.confirmDelete"),
	});
}
