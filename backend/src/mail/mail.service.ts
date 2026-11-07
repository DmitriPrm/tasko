import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";

export interface MailMessage {
	to: string;
	subject: string;
	html: string;
	text: string;
}

/**
 * Отправка почты через SMTP (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM).
 * Если SMTP не настроен, письмо пишется в лог (удобно в разработке), приложение не падает.
 */
@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);
	private readonly transporter: Transporter | null;
	private readonly from: string;

	constructor(config: ConfigService) {
		const host = config.get<string>("SMTP_HOST");
		const user = config.get<string>("SMTP_USER");
		const pass = config.get<string>("SMTP_PASS");
		const port = Number(config.get("SMTP_PORT")) || 587;

		this.from = config.get<string>("MAIL_FROM") || user || "TASKO <no-reply@tasko.local>";
		this.transporter = host
			? createTransport({
					host,
					port,
					secure: config.get("SMTP_SECURE") === "true" || port === 465,
					auth: user ? { user, pass } : undefined,
				})
			: null;

		if (!this.transporter) {
			this.logger.warn("SMTP_HOST не задан: письма не отправляются, а выводятся в лог");
		}
	}

	get isConfigured() {
		return Boolean(this.transporter);
	}

	/** Возвращает true, если письмо передано SMTP-серверу. Ошибки отправки не выбрасываются. */
	async send(message: MailMessage): Promise<boolean> {
		if (!this.transporter) {
			this.logger.log(`[mail:stub] to=${message.to} subject="${message.subject}"\n${message.text}`);
			return false;
		}

		try {
			await this.transporter.sendMail({ from: this.from, ...message });
			return true;
		} catch (error) {
			this.logger.error(`Не удалось отправить письмо на ${message.to}`, error as Error);
			return false;
		}
	}
}
