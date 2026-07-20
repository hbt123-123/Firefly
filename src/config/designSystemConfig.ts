/**
 * 自定义设计系统配置
 * 
 * 基于 TRAE Work 设计系统规范
 * 包含：主题、图形、组件和设计规范
 * 
 * @see https://docs.trae.cn/work_design-system
 */

export interface DesignSystemConfig {
	/** 设计系统名称 */
	name: string;
	/** 设计系统描述 */
	description: string;
	/** 版本号 */
	version: string;
	/** 主题配置 */
	theme: ThemeConfig;
	/** 图形资源配置 */
	graphics: GraphicsConfig;
	/** 组件配置 */
	components: ComponentsConfig;
	/** 设计规范 */
	specifications: DesignSpecifications;
}

export interface ThemeConfig {
	/** 主题色配置 */
	colors: ColorSystem;
	/** 字体配置 */
	typography: TypographySystem;
	/** 间距系统 */
	spacing: SpacingSystem;
	/** 圆角系统 */
	borderRadius: BorderRadiusSystem;
	/** 阴影系统 */
	shadows: ShadowSystem;
	/** 动画系统 */
	animation: AnimationSystem;
	/** 响应式断点 */
	breakpoints: BreakpointSystem;
}

export interface ColorSystem {
	/** 主题色相 (0-360) */
	primaryHue: number;
	/** 语义色 */
	semantics: {
		success: number;
		warning: number;
		error: number;
		info: number;
	};
	/** 明亮模式配色 */
	light: ColorPalette;
	/** 暗黑模式配色 */
	dark: ColorPalette;
}

export interface ColorPalette {
	/** 主色 */
	primary: string;
	/** 背景色 */
	background: string;
	/** 前景色 */
	foreground: string;
	/** 卡片背景 */
	card: string;
	/** 卡片前景 */
	cardForeground: string;
	/** 次要背景 */
	secondary: string;
	/** 次要前景 */
	secondaryForeground: string;
	/** 强调色 */
	accent: string;
	/** 强调色前景 */
	accentForeground: string;
	/** 边框色 */
	border: string;
	/** 输入边框色 */
	inputBorder: string;
	/** 禁用色 */
	disabled: string;
	/** 占位符色 */
	placeholder: string;
}

export interface TypographySystem {
	/** 字体族 */
	fontFamily: {
		sans: string;
		serif: string;
		mono: string;
		display: string;
	};
	/** 字号系统 (rem) */
	fontSize: {
		xs: string;
		sm: string;
		base: string;
		lg: string;
		xl: string;
		"2xl": string;
		"3xl": string;
		"4xl": string;
		"5xl": string;
		"6xl": string;
	};
	/** 字重 */
	fontWeight: {
		normal: number;
		medium: number;
		semibold: number;
		bold: number;
	};
	/** 行高 */
	lineHeight: {
		tight: number;
		normal: number;
		relaxed: number;
		loose: number;
	};
	/** 字间距 */
	letterSpacing: {
		tighter: string;
		tight: string;
		normal: string;
		wide: string;
		wider: string;
	};
}

export interface SpacingSystem {
	/** 基础间距单位 (rem) */
	baseUnit: number;
	/** 间距变量 */
	scale: Record<string, string>;
}

export interface BorderRadiusSystem {
	/** 圆角变量 */
	scale: Record<string, string>;
}

export interface ShadowSystem {
	/** 阴影变量 */
	scale: Record<string, string>;
}

export interface AnimationSystem {
	/** 缓动函数 */
	easing: Record<string, string>;
	/** 动画时长 */
	duration: Record<string, string>;
	/** 动画延迟 */
	delay: Record<string, string>;
}

export interface BreakpointSystem {
	/** 响应式断点 */
	screens: Record<string, string>;
	/** 容器宽度 */
	containers: Record<string, string>;
}

export interface GraphicsConfig {
	/** 图标系统 */
	icons: IconConfig;
	/** 插画系统 */
	illustrations: IllustrationConfig;
	/** SVG 资源 */
	svgs: SVGConfig;
}

export interface IconConfig {
	/** 图标库 */
	library: string;
	/** 图标尺寸 */
	sizes: Record<string, string>;
	/** 图标样式 */
	styles: {
		outline: boolean;
		solid: boolean;
		duotone: boolean;
	};
}

export interface IllustrationConfig {
	/** 插画风格 */
	style: string;
	/** 插画尺寸预设 */
	presets: Record<string, { width: number; height: number }>;
}

export interface SVGConfig {
	/** SVG 优化配置 */
	optimize: boolean;
	/** SVG 颜色模式 */
	colorMode: "current" | "fixed" | "dynamic";
}

export interface ComponentsConfig {
	/** 按钮组件 */
	button: ButtonComponentConfig;
	/** 输入框组件 */
	input: InputComponentConfig;
	/** 卡片组件 */
	card: CardComponentConfig;
	/** 弹窗组件 */
	dialog: DialogComponentConfig;
	/** 导航组件 */
	navbar: NavbarComponentConfig;
	/** 侧边栏组件 */
	sidebar: SidebarComponentConfig;
	/** 标签组件 */
	tabs: TabsComponentConfig;
	/** 表格组件 */
	table: TableComponentConfig;
}

export interface ButtonComponentConfig {
	/** 按钮变体 */
	variants: string[];
	/** 按钮尺寸 */
	sizes: string[];
	/** 默认圆角 */
	borderRadius: string;
	/** 禁用状态 */
	disabled: {
		opacity: number;
		cursor: string;
	};
	/** 加载状态 */
	loading: {
		spinner: boolean;
		text: boolean;
	};
}

export interface InputComponentConfig {
	/** 输入框变体 */
	variants: string[];
	/** 输入框尺寸 */
	sizes: string[];
	/** 默认圆角 */
	borderRadius: string;
	/** 状态样式 */
	states: {
		default: string;
		focus: string;
		error: string;
		disabled: string;
	};
}

export interface CardComponentConfig {
	/** 卡片变体 */
	variants: string[];
	/** 卡片内边距 */
	padding: string;
	/** 卡片圆角 */
	borderRadius: string;
	/** 卡片阴影 */
	shadow: string;
	/** 卡片边框 */
	border: boolean;
}

export interface DialogComponentConfig {
	/** 弹窗尺寸 */
	sizes: string[];
	/** 弹窗圆角 */
	borderRadius: string;
	/** 弹窗动画 */
	animation: {
		enter: string;
		exit: string;
	};
	/** 遮罩层 */
	overlay: {
		opacity: number;
		blur: string;
	};
}

export interface NavbarComponentConfig {
	/** 导航栏高度 */
	height: string;
	/** 导航栏位置 */
	position: "fixed" | "sticky" | "static";
	/** 导航栏样式 */
	variant: "solid" | "blur" | "transparent";
	/** 导航栏阴影 */
	shadow: string;
}

export interface SidebarComponentConfig {
	/** 侧边栏宽度 */
	width: string;
	/** 侧边栏位置 */
	position: "left" | "right" | "both";
	/** 侧边栏样式 */
	variant: "solid" | "blur" | "transparent";
	/** 折叠模式 */
	collapsible: boolean;
}

export interface TabsComponentConfig {
	/** 标签变体 */
	variants: string[];
	/** 标签尺寸 */
	sizes: string[];
	/** 指示器样式 */
	indicator: "underline" | "pill" | "bordered";
}

export interface TableComponentConfig {
	/** 表格变体 */
	variants: string[];
	/** 表格密度 */
	density: "compact" | "normal" | "comfortable";
	/** 表头样式 */
	header: "sticky" | "static";
}

export interface DesignSpecifications {
	/** 设计规范文档路径 */
	docsPath: string;
	/** 设计原则 */
	principles: string[];
	/** 无障碍规范 */
	accessibility: {
		wcagLevel: "A" | "AA" | "AAA";
		focusVisible: boolean;
		keyboardNavigation: boolean;
		screenReader: boolean;
	};
	/** 响应式设计策略 */
	responsive: {
		mobileFirst: boolean;
		breakpointStrategy: "fixed" | "fluid" | "container";
	};
	/** 设计令牌格式 */
	tokens: {
		format: "css" | "scss" | "json" | "all";
		namingConvention: "camelCase" | "kebab-case" | "snake_case";
	};
}

/**
 * 默认设计系统配置
 * 
 * 你可以复制此配置并根据项目需求进行修改
 */
export const designSystemConfig: DesignSystemConfig = {
	name: "Firefly Design System",
	description: "基于 TRAE Work 设计系统规范的自定义设计系统，适用于中后台和平台型产品",
	version: "1.0.0",

	// 主题配置
	theme: {
		// 颜色系统
		colors: {
			primaryHue: 165,
			semantics: {
				success: 150, // 绿色
				warning: 45, // 黄色
				error: 25, // 红色
				info: 210, // 蓝色
			},
			light: {
				primary: "oklch(0.70 0.14 var(--hue))",
				background: "oklch(0.95 0.01 var(--hue))",
				foreground: "oklch(0.25 0.02 var(--hue))",
				card: "white",
				cardForeground: "oklch(0.25 0.02 var(--hue))",
				secondary: "oklch(0.95 0.025 var(--hue))",
				secondaryForeground: "oklch(0.55 0.12 var(--hue))",
				accent: "oklch(0.90 0.05 var(--hue))",
				accentForeground: "oklch(0.35 0.07 var(--hue))",
				border: "rgba(0, 0, 0, 0.08)",
				inputBorder: "rgba(0, 0, 0, 0.1)",
				disabled: "rgba(0, 0, 0, 0.3)",
				placeholder: "rgba(0, 0, 0, 0.5)",
			},
			dark: {
				primary: "oklch(0.75 0.14 var(--hue))",
				background: "oklch(0.16 0.014 var(--hue))",
				foreground: "oklch(0.95 0.01 var(--hue))",
				card: "oklch(0.23 0.015 var(--hue))",
				cardForeground: "oklch(0.95 0.01 var(--hue))",
				secondary: "oklch(0.33 0.035 var(--hue))",
				secondaryForeground: "oklch(0.75 0.1 var(--hue))",
				accent: "oklch(0.40 0.08 var(--hue))",
				accentForeground: "oklch(0.90 0.05 var(--hue))",
				border: "rgba(255, 255, 255, 0.08)",
				inputBorder: "rgba(255, 255, 255, 0.1)",
				disabled: "rgba(255, 255, 255, 0.3)",
				placeholder: "rgba(255, 255, 255, 0.6)",
			},
		},

		// 字体系统
		typography: {
			fontFamily: {
				sans: "'Roboto', 'sans-serif', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
				serif: "'Noto Serif SC', 'Source Han Serif SC', serif",
				mono: "'JetBrains Mono', 'Fira Code', monospace",
				display: "'Inter', 'PingFang SC', system-ui, sans-serif",
			},
			fontSize: {
				xs: "0.75rem", // 12px
				sm: "0.875rem", // 14px
				base: "1rem", // 16px
				lg: "1.125rem", // 18px
				xl: "1.25rem", // 20px
				"2xl": "1.5rem", // 24px
				"3xl": "1.875rem", // 30px
				"4xl": "2.25rem", // 36px
				"5xl": "3rem", // 48px
				"6xl": "3.75rem", // 60px
			},
			fontWeight: {
				normal: 400,
				medium: 500,
				semibold: 600,
				bold: 700,
			},
			lineHeight: {
				tight: 1.25,
				normal: 1.5,
				relaxed: 1.625,
				loose: 2,
			},
			letterSpacing: {
				tighter: "-0.05em",
				tight: "-0.025em",
				normal: "0",
				wide: "0.025em",
				wider: "0.05em",
			},
		},

		// 间距系统
		spacing: {
			baseUnit: 0.25, // 4px
			scale: {
				"0": "0",
				"0.5": "0.125rem", // 2px
				"1": "0.25rem", // 4px
				"1.5": "0.375rem", // 6px
				"2": "0.5rem", // 8px
				"2.5": "0.625rem", // 10px
				"3": "0.75rem", // 12px
				"3.5": "0.875rem", // 14px
				"4": "1rem", // 16px
				"5": "1.25rem", // 20px
				"6": "1.5rem", // 24px
				"7": "1.75rem", // 28px
				"8": "2rem", // 32px
				"9": "2.25rem", // 36px
				"10": "2.5rem", // 40px
				"11": "2.75rem", // 44px
				"12": "3rem", // 48px
				"14": "3.5rem", // 56px
				"16": "4rem", // 64px
				"20": "5rem", // 80px
				"24": "6rem", // 96px
				"28": "7rem", // 112px
				"32": "8rem", // 128px
				"36": "9rem", // 144px
				"40": "10rem", // 160px
				"44": "11rem", // 176px
				"48": "12rem", // 192px
				"52": "13rem", // 208px
				"56": "14rem", // 224px
				"60": "15rem", // 240px
				"64": "16rem", // 256px
				"72": "18rem", // 288px
				"80": "20rem", // 320px
				"96": "24rem", // 384px
			},
		},

		// 圆角系统
		borderRadius: {
			scale: {
				none: "0",
				sm: "0.125rem", // 2px
				DEFAULT: "0.25rem", // 4px
				md: "0.375rem", // 6px
				lg: "0.5rem", // 8px
				xl: "0.75rem", // 12px
				"2xl": "1rem", // 16px
				"3xl": "1.5rem", // 24px
				full: "9999px",
			},
		},

		// 阴影系统
		shadows: {
			scale: {
				sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
				DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
				md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
				lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
				xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
				"2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
				inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
				none: "none",
			},
		},

		// 动画系统
		animation: {
			easing: {
				linear: "linear",
				in: "cubic-bezier(0.4, 0, 1, 1)",
				out: "cubic-bezier(0, 0, 0.2, 1)",
				"in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
				bounce: "cubic-bezier(0, 0, 0.2, 1)",
				snap: "cubic-bezier(0.2, 0, 0, 1)",
			},
			duration: {
				"75": "75ms",
				"100": "100ms",
				"150": "150ms",
				"200": "200ms",
				"300": "300ms",
				"500": "500ms",
				"700": "700ms",
				"1000": "1000ms",
			},
			delay: {
				none: "0ms",
				"75": "75ms",
				"100": "100ms",
				"150": "150ms",
				"200": "200ms",
				"300": "300ms",
				"500": "500ms",
				"700": "700ms",
				"1000": "1000ms",
			},
		},

		// 响应式断点
		breakpoints: {
			screens: {
				xs: "320px",
				sm: "480px",
				md: "768px",
				lg: "1024px",
				xl: "1280px",
				"2xl": "1536px",
			},
			containers: {
				xs: "100%",
				sm: "100%",
				md: "100%",
				lg: "1024px",
				xl: "1280px",
				"2xl": "1536px",
			},
		},
	},

	// 图形配置
	graphics: {
		// 图标系统
		icons: {
			library: "iconify", // 支持: iconify, heroicons, lucide, tabler
			sizes: {
				xs: "0.75rem", // 12px
				sm: "1rem", // 16px
				md: "1.25rem", // 20px
				lg: "1.5rem", // 24px
				xl: "2rem", // 32px
				"2xl": "2.5rem", // 40px
			},
			styles: {
				outline: true,
				solid: true,
				duotone: true,
			},
		},

		// 插画系统
		illustrations: {
			style: "minimal", // minimal, detailed, abstract
			presets: {
				small: { width: 200, height: 200 },
				medium: { width: 400, height: 300 },
				large: { width: 800, height: 600 },
				hero: { width: 1200, height: 630 },
			},
		},

		// SVG 配置
		svgs: {
			optimize: true,
			colorMode: "current", // current, fixed, dynamic
		},
	},

	// 组件配置
	components: {
		// 按钮组件
		button: {
			variants: ["primary", "secondary", "outline", "ghost", "link", "destructive"],
			sizes: ["sm", "md", "lg", "icon"],
			borderRadius: "var(--radius-lg)",
			disabled: {
				opacity: 0.5,
				cursor: "not-allowed",
			},
			loading: {
				spinner: true,
				text: true,
			},
		},

		// 输入框组件
		input: {
			variants: ["default", "filled", "underline"],
			sizes: ["sm", "md", "lg"],
			borderRadius: "var(--radius-md)",
			states: {
				default: "border-[var(--input-border)]",
				focus: "border-[var(--primary)] ring-2 ring-[var(--primary)]/20",
				error: "border-red-500 focus:border-red-500 focus:ring-red-500/20",
				disabled: "bg-[var(--secondary)] text-[var(--disabled)]",
			},
		},

		// 卡片组件
		card: {
			variants: ["default", "elevated", "bordered", "interactive"],
			padding: "var(--spacing-lg)",
			borderRadius: "var(--radius-2xl)",
			shadow: "var(--shadow-sm)",
			border: true,
		},

		// 弹窗组件
		dialog: {
			sizes: ["sm", "md", "lg", "xl", "full"],
			borderRadius: "var(--radius-2xl)",
			animation: {
				enter: "fade-in zoom-in-95",
				exit: "fade-out zoom-out-95",
			},
			overlay: {
				opacity: 0.5,
				blur: "4px",
			},
		},

		// 导航栏组件
		navbar: {
			height: "4rem", // 64px
			position: "sticky",
			variant: "blur",
			shadow: "var(--shadow-navbar)",
		},

		// 侧边栏组件
		sidebar: {
			width: "320px",
			position: "both",
			variant: "solid",
			collapsible: true,
		},

		// 标签组件
		tabs: {
			variants: ["line", "enclosed", "pills"],
			sizes: ["sm", "md", "lg"],
			indicator: "underline",
		},

		// 表格组件
		table: {
			variants: ["simple", "striped", "bordered"],
			density: "normal",
			header: "sticky",
		},
	},

	// 设计规范
	specifications: {
		docsPath: "/docs/design-system",
		principles: [
			"一致性：确保视觉和交互体验的一致性",
			"可访问性：遵循 WCAG 2.1 AA 级别无障碍标准",
			"响应式：支持从移动端到桌面端的全响应式设计",
			"可扩展：支持主题定制和组件扩展",
			"性能优先：优化渲染性能和加载速度",
		],
		accessibility: {
			wcagLevel: "AA",
			focusVisible: true,
			keyboardNavigation: true,
			screenReader: true,
		},
		responsive: {
			mobileFirst: true,
			breakpointStrategy: "fluid",
		},
		tokens: {
			format: "css",
			namingConvention: "kebab-case",
		},
	},
};

/**
 * 设计系统 CSS 变量映射
 * 
 * 将设计系统配置转换为 CSS 变量
 */
export function generateCSSVariables(config: DesignSystemConfig): Record<string, string> {
	const vars: Record<string, string> = {};

	// 主题色
	vars["--hue"] = String(config.theme.colors.primaryHue);

	// 间距
	for (const [key, value] of Object.entries(config.theme.spacing.scale)) {
		vars[`--spacing-${key}`] = value;
	}

	// 圆角
	for (const [key, value] of Object.entries(config.theme.borderRadius.scale)) {
		vars[`--radius-${key === "DEFAULT" ? "" : key}`] = value;
	}

	// 阴影
	for (const [key, value] of Object.entries(config.theme.shadows.scale)) {
		vars[`--shadow-${key === "DEFAULT" ? "DEFAULT" : key}`] = value;
	}

	// 动画
	for (const [key, value] of Object.entries(config.theme.animation.duration)) {
		vars[`--duration-${key}`] = value;
	}

	for (const [key, value] of Object.entries(config.theme.animation.delay)) {
		vars[`--delay-${key}`] = value;
	}

	return vars;
}

/**
 * 导出设计系统配置
 */
export default designSystemConfig;