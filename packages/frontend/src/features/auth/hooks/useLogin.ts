import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export const useLogin = () => {
  const { login } = useAuth();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      login(input.email, input.password),
  });
};
