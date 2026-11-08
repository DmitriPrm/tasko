const BRAND = "#4f56e8";

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

interface LayoutOptions {
	title: string;
	paragraphs: string[];
	buttonLabel: string;
	url: string;
	footer: string;
}

function layout({ title, paragraphs, buttonLabel, url, footer }: LayoutOptions) {
	const body = paragraphs.map((text) => `<p style="margin:0 0 16px;font-size:15px;color:#3b4258">${text}</p>`).join("");

	return `<!doctype html>
<html lang="ru">
<body style="margin:0;padding:24px;background:#f3f4f9;font-family:Inter,Segoe UI,Arial,sans-serif">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
		<tr><td align="center">
			<table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
				<tr><td>
					<div style="font-size:20px;font-weight:700;color:${BRAND};margin-bottom:20px">TASKO</div>
					<h1 style="margin:0 0 16px;font-size:20px;color:#151a2d">${title}</h1>
					${body}
					<p style="margin:24px 0">
						<a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600">${buttonLabel}</a>
					</p>
					<p style="margin:0 0 8px;font-size:12px;color:#8e96ad">Если кнопка не работает, скопируйте ссылку в браузер:<br><span style="word-break:break-all">${url}</span></p>
					<p style="margin:16px 0 0;font-size:12px;color:#8e96ad">${footer}</p>
				</td></tr>
			</table>
		</td></tr>
	</table>
</body>
</html>`;
}

export function verifyEmailMail(fullName: string, url: string) {
	const name = escapeHtml(fullName);
	return {
		subject: "Подтвердите email в TASKO",
		text: `Здравствуйте, ${fullName}! Подтвердите email по ссылке: ${url}\nСсылка действует 24 часа. Если вы не регистрировались, просто проигнорируйте письмо.`,
		html: layout({
			title: "Подтвердите email",
			paragraphs: [`Здравствуйте, ${name}!`, "Чтобы завершить регистрацию в TASKO, подтвердите адрес почты."],
			buttonLabel: "Подтвердить email",
			url,
			footer: "Ссылка действует 24 часа. Если вы не регистрировались, просто проигнорируйте это письмо.",
		}),
	};
}

export function invitationMail(inviterName: string, projectName: string, url: string, daysValid: number) {
	const inviter = escapeHtml(inviterName);
	const project = escapeHtml(projectName);
	return {
		subject: `Приглашение в проект «${projectName}»`,
		text: `${inviterName} приглашает вас в проект «${projectName}» в TASKO. Откройте ссылку: ${url}\nПриглашение действует ${daysValid} дн.`,
		html: layout({
			title: "Вас приглашают в проект",
			paragraphs: [
				`<b>${inviter}</b> приглашает вас присоединиться к проекту <b>«${project}»</b> в TASKO.`,
				"Если у вас ещё нет аккаунта, его можно создать по этой же ссылке.",
			],
			buttonLabel: "Открыть приглашение",
			url,
			footer: `Приглашение действует ${daysValid} дн. Если оно адресовано не вам, просто проигнорируйте письмо.`,
		}),
	};
}
