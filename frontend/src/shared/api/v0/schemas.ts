import { z } from "zod";

export const ZSystemRole = z.enum(["ADMIN", "MANAGER", "EXECUTOR"]);
export const ZProjectStatus = z.enum(["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"]);
export const ZProjectRole = z.enum(["MANAGER", "MEMBER"]);
export const ZTaskType = z.enum(["TASK", "FEATURE", "BUG", "RESEARCH"]);
export const ZTaskPriority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const ZTaskStatus = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]);
export const ZNotificationType = z.enum([
	"TASK_ASSIGNED",
	"DEADLINE_CHANGED",
	"STATUS_CHANGED",
	"DEADLINE_APPROACHING",
	"PROJECT_INVITATION",
]);

export const ZUser = z.object({
	id: z.string(),
	email: z.string(),
	fullName: z.string(),
	systemRole: ZSystemRole,
	isActive: z.boolean(),
	emailVerified: z.boolean().optional(),
	initials: z.string(),
	avatarColor: z.string(),
	avatarUrl: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	permissions: z.array(z.string()).optional(),
});

export const ZProfileFieldType = z.enum(["TEXT", "TEXTAREA", "NUMBER", "DATE", "CHECKBOX", "SELECT", "MULTI_SELECT"]);

export const ZProfileField = z.object({
	id: z.string(),
	name: z.string(),
	type: ZProfileFieldType,
	options: z.array(z.string()),
	value: z.string(),
	position: z.number().optional(),
});

export const ZProfileSection = z.object({
	id: z.string(),
	title: z.string(),
	position: z.number(),
	fields: z.array(ZProfileField),
});

export const ZProfile = ZUser.extend({
	canEdit: z.boolean(),
	canEditRights: z.boolean(),
	permissions: z.array(z.string()),
	sections: z.array(ZProfileSection),
});

export const ZPermissionGrant = z.object({
	role: ZSystemRole,
	code: z.string(),
	enabled: z.boolean(),
});

export const ZPermissionMatrix = z.object({
	roles: z.array(ZSystemRole),
	items: z.array(z.object({ code: z.string(), group: z.string() })),
	grants: z.array(ZPermissionGrant),
});

export const ZFormField = z.object({
	code: z.string(),
	name: z.string(),
	type: z.enum(["text", "textarea", "select", "date", "datetime", "checkbox", "password"]),
	value: z.union([z.string(), z.boolean(), z.null()]),
	require: z.boolean().optional(),
	disabled: z.boolean().optional(),
	description: z.string().optional(),
	possibleValues: z
		.array(
			z.object({
				id: z.string(),
				code: z.string(),
				name: z.string(),
			}),
		)
		.optional(),
});

export const ZFormSchema = z.object({
	fields: z.array(ZFormField),
});

export const ZProjectMember = z.object({
	id: z.string(),
	projectId: z.string(),
	userId: z.string(),
	projectRole: ZProjectRole,
	joinedAt: z.string(),
	user: ZUser,
});

export const ZTag = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	color: z.string(),
	createdAt: z.string(),
});

export const ZProject = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	status: ZProjectStatus,
	ownerId: z.string(),
	owner: ZUser,
	plannedStartAt: z.string().nullable(),
	plannedEndAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	membersCount: z.number(),
	tasksCount: z.number(),
	isFavorite: z.boolean().optional(),
	tags: z.array(ZTag).optional(),
	members: z.array(ZProjectMember).optional(),
});

export const ZProjectColumn = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	color: z.string(),
	status: ZTaskStatus,
	position: z.number(),
	tasksCount: z.number().optional().default(0),
});

export const ZForecastFactor = z.object({
	feature: z.string(),
	label: z.string(),
	impact: z.number(),
	value: z.union([z.string(), z.number()]).nullable().optional(),
});

/** Прогноз задачи: source ML — обученная модель, RULES — простые правила, пока модели нет */
export const ZTaskForecast = z.object({
	source: z.enum(["ML", "RULES"]).default("RULES"),
	durationDays: z.number(),
	durationHours: z.number().optional(),
	riskProbability: z.number(),
	riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
	calculatedAt: z.string(),
	inputs: z.array(z.object({ code: z.string(), value: z.string() })),
	factors: z.array(z.string()),
	riskFactors: z.array(ZForecastFactor).default([]),
	durationFactors: z.array(ZForecastFactor).default([]),
	models: z.object({ duration: z.string().nullable(), risk: z.string().nullable() }).nullable().optional(),
});

export const ZTaskPrediction = z.object({
	forecast: ZTaskForecast,
	mlEnabled: z.boolean(),
	refreshed: z.boolean().optional(),
	history: z.array(
		z.object({
			id: z.string(),
			trigger: z.enum(["CREATED", "UPDATED", "MANUAL"]),
			durationHours: z.number().nullable(),
			riskProbability: z.number().nullable(),
			durationModel: z.string().nullable(),
			riskModel: z.string().nullable(),
			createdAt: z.string(),
		}),
	),
});

export const ZTask = z.object({
	id: z.string(),
	projectId: z.string(),
	authorId: z.string(),
	assigneeId: z.string().nullable(),
	parentTaskId: z.string().nullable(),
	columnId: z.string().nullable().optional(),
	title: z.string(),
	description: z.string().nullable(),
	type: ZTaskType,
	priority: ZTaskPriority,
	status: ZTaskStatus,
	isCompleted: z.boolean().optional().default(false),
	plannedStartAt: z.string().nullable(),
	deadlineAt: z.string().nullable(),
	actualStartAt: z.string().nullable(),
	completedAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	author: ZUser,
	assignee: ZUser.nullable(),
	coAssignees: z.array(ZUser).optional(),
	tags: z.array(ZTag).optional(),
	project: z
		.object({
			id: z.string(),
			name: z.string(),
			status: ZProjectStatus,
		})
		.optional(),
	commentsCount: z.number(),
	subtasksCount: z.number(),
	isStarted: z.boolean().optional(),
	parentTask: z.object({ id: z.string(), title: z.string() }).nullable().optional(),
	openBlockersCount: z.number().optional(),
	attachmentsCount: z.number().optional(),
	canEdit: z.boolean().optional(),
	forecast: ZTaskForecast.optional(),
});

export const ZComment = z.object({
	id: z.string(),
	taskId: z.string(),
	authorId: z.string(),
	body: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	author: ZUser,
});

export const ZNotification = z.object({
	id: z.string(),
	type: ZNotificationType,
	title: z.string(),
	body: z.string(),
	relatedTaskId: z.string().nullable(),
	isRead: z.boolean(),
	createdAt: z.string(),
});

export const ZPaginated = <T extends z.ZodType>(item: T) =>
	z.object({
		items: z.array(item),
		total: z.number(),
		page: z.number(),
		perPage: z.number(),
	});

export const ZAuthSession = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	user: ZUser,
});

export const ZRegisterSession = ZAuthSession.extend({
	verificationSent: z.boolean(),
	joinedProjectId: z.string().nullable(),
});

export const ZInvitationStatus = z.enum(["PENDING", "ACCEPTED", "DECLINED", "REVOKED", "EXPIRED"]);

export const ZInvitation = z.object({
	id: z.string(),
	email: z.string(),
	projectRole: ZProjectRole,
	status: ZInvitationStatus,
	expiresAt: z.string(),
	createdAt: z.string(),
	project: z.object({ id: z.string(), name: z.string() }),
	invitedBy: z.object({ id: z.string(), fullName: z.string() }),
});

export const ZInvitationCreated = ZInvitation.extend({
	emailSent: z.boolean(),
	inviteUrl: z.string(),
});

export const ZInvitationPreview = ZInvitation.extend({
	userExists: z.boolean(),
});

export const ZTokens = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});

export const ZTaskHistory = z.object({
	statusHistory: z.array(
		z.object({
			id: z.string(),
			fromStatus: ZTaskStatus.nullable(),
			toStatus: ZTaskStatus,
			comment: z.string().nullable(),
			changedAt: z.string(),
			actor: z.object({
				id: z.string(),
				fullName: z.string(),
			}),
		}),
	),
	changeHistory: z.array(
		z.object({
			id: z.string(),
			fieldName: z.string(),
			oldValue: z.string().nullable(),
			newValue: z.string().nullable(),
			changedAt: z.string(),
			actor: z.object({
				id: z.string(),
				fullName: z.string(),
			}),
		}),
	),
});

export const ZAnalyticsOverview = z.object({
	total: z.number(),
	byStatus: z.record(z.string(), z.number()),
	byRisk: z.object({ LOW: z.number(), MEDIUM: z.number(), HIGH: z.number() }).optional(),
	completed: z.number(),
	overdue: z.number(),
	onTimeRate: z.number(),
	averageDurationHours: z.number(),
	medianDurationHours: z.number(),
});

export const ZWorkloadItem = z.object({
	userId: z.string(),
	fullName: z.string(),
	email: z.string(),
	initials: z.string().optional(),
	avatarColor: z.string().optional(),
	avatarUrl: z.string().nullable().optional(),
	activeTasks: z.number(),
});

export const ZDashboard = z.object({
	summary: z.object({
		active: z.number(),
		overdue: z.number(),
		highRisk: z.number(),
	}),
	projects: z.array(ZProject),
	myTasks: z.array(ZTask),
	upcomingDeadlines: z.array(ZTask),
});

export const ZTableLayout = z.object({
	code: z.string(),
	widths: z.record(z.string(), z.number()),
});

export const ZTaskRemoveResult = z.object({
	success: z.boolean(),
	/** true — задача уже была в работе и не удалена, а отменена */
	cancelled: z.boolean(),
});

export const ZSuccess = z.object({
	success: z.boolean(),
});

export const ZUnreadCount = z.object({
	count: z.number(),
});

export type User = z.infer<typeof ZUser>;
export type Profile = z.infer<typeof ZProfile>;
export type ProfileField = z.infer<typeof ZProfileField>;
export type ProfileFieldType = z.infer<typeof ZProfileFieldType>;
export type ProfileSection = z.infer<typeof ZProfileSection>;
export type PermissionMatrix = z.infer<typeof ZPermissionMatrix>;
export type Project = z.infer<typeof ZProject>;
export type ProjectMember = z.infer<typeof ZProjectMember>;
export type Tag = z.infer<typeof ZTag>;
export type Task = z.infer<typeof ZTask>;
export type TaskForecast = z.infer<typeof ZTaskForecast>;
export type TaskPrediction = z.infer<typeof ZTaskPrediction>;
export type ProjectColumn = z.infer<typeof ZProjectColumn>;
export type Comment = z.infer<typeof ZComment>;
export type Invitation = z.infer<typeof ZInvitation>;
export type InvitationPreview = z.infer<typeof ZInvitationPreview>;
export type InvitationCreated = z.infer<typeof ZInvitationCreated>;
export type Notification = z.infer<typeof ZNotification>;
export type SystemRole = z.infer<typeof ZSystemRole>;
export type ProjectStatus = z.infer<typeof ZProjectStatus>;
export type TaskStatus = z.infer<typeof ZTaskStatus>;
export type TaskPriority = z.infer<typeof ZTaskPriority>;
export type TaskType = z.infer<typeof ZTaskType>;
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type TaskHistory = z.infer<typeof ZTaskHistory>;

/** Короткая карточка задачи для подзадач и связей */
export const ZBriefTask = z.object({
	id: z.string(),
	title: z.string(),
	status: ZTaskStatus,
	isCompleted: z.boolean(),
	deadlineAt: z.string().nullable(),
	assignee: ZUser.nullable(),
});

const ZDependencyItem = z.object({ dependencyId: z.string(), task: ZBriefTask });

export const ZTaskDependencies = z.object({
	blockedBy: z.array(ZDependencyItem),
	blocks: z.array(ZDependencyItem),
	related: z.array(ZDependencyItem),
});

export type BriefTask = z.infer<typeof ZBriefTask>;
export type TaskDependencies = z.infer<typeof ZTaskDependencies>;
export type DependencyKind = "DEPENDS_ON" | "BLOCKS" | "RELATED";

export const ZAttachment = z.object({
	id: z.string(),
	taskId: z.string(),
	originalName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	createdAt: z.string(),
	uploader: ZUser,
});

export type Attachment = z.infer<typeof ZAttachment>;
