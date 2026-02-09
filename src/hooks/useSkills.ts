import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InstallSkillParams, SearchSkillsParams, Skill } from "@/lib/api";
import { useApi } from "./useApi";

export function useInstalledSkills() {
  const api = useApi();

  return useQuery({
    queryKey: ["skills", "installed"],
    queryFn: () => api.listInstalledSkills(),
  });
}

export function useSearchSkills(params: SearchSkillsParams = {}) {
  const api = useApi();

  return useQuery({
    queryKey: ["skills", "search", params],
    queryFn: () => api.searchSkills(params),
    enabled: true,
  });
}

export function useInstallSkill() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: InstallSkillParams) => api.installSkill(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", "installed"] });
    },
  });
}

export function useUninstallSkill() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => api.uninstallSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", "installed"] });
    },
  });
}

export function useToggleSkill() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ skillId, enabled }: { skillId: string; enabled: boolean }) =>
      api.setSkillEnabled(skillId, enabled),
    onMutate: async ({ skillId, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["skills", "installed"] });

      const previousData = queryClient.getQueryData(["skills", "installed"]);

      queryClient.setQueryData(
        ["skills", "installed"],
        (old: { skills: Skill[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            skills: old.skills.map((s) =>
              s.id === skillId ? { ...s, enabled } : s,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["skills", "installed"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", "installed"] });
    },
  });
}
