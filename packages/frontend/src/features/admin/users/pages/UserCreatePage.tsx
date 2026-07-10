import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, message } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { UserForm } from '../components/UserForm';
import { useCreateUser } from '../hooks/useUserMutations';
import { ApiError } from '@/types/api';

export const UserCreatePage = () => {
  const nav = useNavigate();
  const create = useCreateUser();
  const [messageApi, contextHolder] = message.useMessage();
  const [serverFieldError, setServerFieldError] = useState<
    { field: string; message: string } | null
  >(null);

  return (
    <div>
      {contextHolder}
      <PageHeader title="New user" subtitle="Create a system account" />
      <Card style={{ maxWidth: 720 }}>
        <UserForm
          mode="create"
          submitting={create.isPending}
          serverFieldError={serverFieldError}
          onCancel={() => nav('/admin/users')}
          onSubmit={async (values) => {
            setServerFieldError(null);
            try {
              await create.mutateAsync({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                roleId: values.roleId,
                password: values.password,
              });
              messageApi.success('User created');
              nav('/admin/users');
            } catch (err) {
              const apiErr = err as ApiError;
              if (apiErr.code === 'DUPLICATE_EMAIL') {
                setServerFieldError({
                  field: 'email',
                  message: 'This email is already registered',
                });
              } else if (apiErr.code === 'AUTH_WEAK_PASSWORD') {
                setServerFieldError({
                  field: 'password',
                  message: apiErr.message,
                });
              } else {
                messageApi.error(apiErr.message || 'Failed to create user');
              }
            }
          }}
        />
      </Card>
    </div>
  );
};
