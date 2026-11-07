<script lang="ts" setup>
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseLogo from "@/shared/ui/logo/BaseLogo.vue";

defineProps<{
	eyebrow?: string;
	title: string;
}>();

const features = ["auth.feature1", "auth.feature2", "auth.feature3"];
</script>

<template>
	<section class="auth-shell">
		<aside class="auth-shell__aside">
			<div class="auth-shell__aside-inner">
				<span class="auth-shell__logo"><base-logo :size="30" plain /></span>
				<h2>{{ translate("app.name") }}</h2>
				<p>{{ translate("app.subtitle") }}</p>
				<ul class="auth-shell__features">
					<li v-for="item in features" :key="item">{{ translate(item) }}</li>
				</ul>
			</div>
		</aside>
		<base-flex class="auth-shell__layout" align="center" justify="center">
			<div class="auth-shell__card">
				<base-flex direction="column" :gap="2">
					<span v-if="eyebrow" class="auth-shell__brand">{{ eyebrow }}</span>
					<h1>{{ title }}</h1>
				</base-flex>
				<slot />
			</div>
		</base-flex>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.auth-shell {
	display: grid;
	grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
	min-height: 100vh;
	background: var(--mt-color-bg);

	&__aside {
		position: relative;
		display: flex;
		align-items: center;
		padding: map.get($spacers, 12);
		overflow: hidden;
		background: var(--mt-gradient-brand);
		color: #fff;

		&::before,
		&::after {
			content: "";
			position: absolute;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.1);
		}

		&::before {
			top: -140px;
			right: -120px;
			width: 420px;
			height: 420px;
		}

		&::after {
			bottom: -180px;
			left: -100px;
			width: 460px;
			height: 460px;
			background: rgba(255, 255, 255, 0.07);
		}
	}

	&__aside-inner {
		position: relative;
		z-index: 1;
		max-width: 420px;

		h2 {
			margin: map.get($spacers, 6) 0 map.get($spacers, 2);
			font-size: map.get($font-sizes, 1);
			font-weight: 700;
			letter-spacing: -0.03em;
		}

		p {
			margin: 0;
			color: rgba(255, 255, 255, 0.78);
			font-size: map.get($font-sizes, 4);
		}
	}

	&__logo {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border: 1px solid rgba(255, 255, 255, 0.35);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.18);
		backdrop-filter: blur(8px);
	}

	&__features {
		display: grid;
		gap: map.get($spacers, 3);
		margin: map.get($spacers, 10) 0 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			align-items: center;
			gap: map.get($spacers, 3);
			font-size: map.get($font-sizes, 5);
			font-weight: 500;

			&::before {
				content: "✓";
				display: grid;
				flex-shrink: 0;
				place-items: center;
				width: 24px;
				height: 24px;
				border-radius: 50%;
				background: rgba(255, 255, 255, 0.22);
				font-size: map.get($font-sizes, 7);
			}
		}
	}

	&__layout {
		min-height: 100vh;
		padding: map.get($spacers, 8);
	}

	&__card {
		width: min(420px, 100%);
	}

	&__brand {
		color: var(--mt-color-primary);
		font-size: map.get($font-sizes, 7);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: map.get($font-sizes, 1);
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	&__form {
		margin-top: map.get($spacers, 8);

		:deep(.el-form-item__label) {
			margin-bottom: map.get($spacers, 1);
		}
	}

	&__submit {
		width: 100%;
		height: 44px;
		margin-top: map.get($spacers, 2);
		font-size: map.get($font-sizes, 5);
	}

	&__footer {
		margin-top: map.get($spacers, 5);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);

		a {
			color: var(--mt-color-primary);
			font-weight: 600;
		}
	}

	&__notice {
		margin-top: map.get($spacers, 6);
		padding: map.get($spacers, 4);
		border-radius: var(--mt-radius);
		background: var(--mt-color-primary-light);
		color: var(--mt-color-text);
		font-size: map.get($font-sizes, 6);
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;

		&__aside {
			display: none;
		}
	}

	@media (max-width: 768px) {
		&__layout {
			padding: map.get($spacers, 4);
		}

		h1 {
			font-size: map.get($font-sizes, 2);
		}
	}
}
</style>
