import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Skeleton, message, Alert } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { UserForm } from '../components/UserForm';
import { useUser } from '../hooks/useUsers';
import { useUpdateUser } from '../hooks/useUserMutations';
import { ApiError } from '@/types/api';

export const UserEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const userQuery = useUser(id);
  const update = useUpdateUser(id);
  const [serverFieldError, setServerFieldError] = useState<
    { field: string; message: string } | null
  >(null);

  return (
    <div>
      {contextHolder}
      <PageHeader title="Edit user" subtitle={userQuery.data?.email ?? ''} />
      <Card style={{ maxWidth: 720 }}>
        {userQuery.isLoading ? (
          <Skeleton active />
        ) : userQuery.isError ? (
          <Alert type="error" message="Failed to load user" showIcon />
        ) : userQuery.data ? (
          <UserForm
            mode="edit"
            submitting={update.isPending}
            serverFieldError={serverFieldError}
            initialValues={{
              firstName: userQuery.data.firstName,
              lastName: userQuery.data.lastName,
              email: userQuery.data.email,
            }}
            onCancel={() => nav('/admin/users')}
            onSubmit={async (values) => {
              setServerFieldError(null);
              try {
                await update.mutateAsync(values);
                messageApi.success('User updated');
                nav('/admin/users');
              } catch (err) {
                const apiErr = err as ApiError;
                if (apiErr.code === 'DUPLICATE_EMAIL') {
                  setServerFieldError({
                    field: 'email',
                    message: 'This email is already registered',
                  });
                } else {
                  messageApi.error(apiErr.message || 'Failed to update user');
                }
              }
            }}
          />
        ) : null}
      </Card>
    </div>
  );
};
