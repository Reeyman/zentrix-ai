import WorkflowPanel from "./WorkflowPanel";

type UserOnboardingWorkflowProps = {
  usersCount: number;
  activeUsers: number;
  pendingUsers: number;
  protectedUsers: number;
  workspaceName: string;
};

export default function UserOnboardingWorkflow({
  usersCount,
  activeUsers,
  pendingUsers,
  protectedUsers,
  workspaceName,
}: UserOnboardingWorkflowProps) {
  const hasUsers = usersCount > 0;
  const currentIndex = !hasUsers ? 0 : pendingUsers > 0 ? 1 : protectedUsers < activeUsers ? 2 : 3;

  return (
    <WorkflowPanel
      eyebrow="User onboarding"
      title="Move identities from invite to protected activation"
      summary="Keep invites, role assignment, protection controls, and first activation inside one calm directory flow."
      status={pendingUsers > 0 ? "Pending" : activeUsers > 0 ? "Active" : "Scheduled"}
      tone="blue"
      metrics={[
        { label: "Users", value: String(usersCount), helper: workspaceName || "Selected workspace" },
        { label: "Pending invites", value: String(pendingUsers), helper: pendingUsers ? "Needs review" : "No open invites" },
        { label: "Protected", value: String(protectedUsers), helper: activeUsers ? `${Math.round((protectedUsers / Math.max(activeUsers, 1)) * 100)}% of active users` : "No active users yet" },
      ]}
      steps={[
        {
          id: "invite",
          title: "Invite the identity",
          description: "Create or sync the user record into the selected workspace directory.",
          state: currentIndex > 0 ? "completed" : "current",
          meta: hasUsers ? `${usersCount} identities already in scope` : "No identities onboarded yet",
        },
        {
          id: "role",
          title: "Assign the workspace role",
          description: "Map the user to the correct owner, admin, member, or viewer template.",
          state: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming",
          meta: pendingUsers ? `${pendingUsers} invites still need role confirmation` : "Role assignments are stable",
        },
        {
          id: "protect",
          title: "Confirm SSO or MFA coverage",
          description: "Apply the protection baseline before the user becomes fully active in the workspace.",
          state: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming",
          meta: protectedUsers ? `${protectedUsers} identities already protected` : "Protection controls still need rollout",
        },
        {
          id: "activate",
          title: "Activate and monitor first sign-in",
          description: "Track first access so the onboarding flow closes with a healthy identity state.",
          state: currentIndex === 3 ? "current" : "upcoming",
          meta: activeUsers ? `${activeUsers} active identities available now` : "Activation starts after invite acceptance",
        },
      ]}
      footer="Pair reminder packages with queued access reviews so pending identities do not drift outside the review SLA."
    />
  );
}
