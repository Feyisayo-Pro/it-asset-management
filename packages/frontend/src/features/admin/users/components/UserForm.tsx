import { useEffect } from 'react';
import { Controller, FieldValues, Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Input, Space } from 'antd';
import { RolePicker } from './RolePicker';
import {
  CreateUserFormValues,
  EditUserFormValues,
  createUserSchema,
  editUserSchema,
} from '../schemas/user.schema';

interface CreateProps {
  mode: 'create';
  onSubmit: (values: CreateUserFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  serverFieldError?: { field: string; message: string } | null;
}

interface EditProps {
  mode: 'edit';
  initialValues: EditUserFormValues;
  onSubmit: (values: EditUserFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  serverFieldError?: { field: string; message: string } | null;
}

type Props = CreateProps | EditProps;

export const UserForm = (props: Props) => {
  const isCreate = props.mode === 'create';
  const schema = isCreate ? createUserSchema : editUserSchema;
  const defaults: FieldValues = isCreate
    ? {
        firstName: '',
        lastName: '',
        email: '',
        roleId: '',
        password: '',
        confirmPassword: '',
      }
    : (props.initialValues as FieldValues);
  const form = useForm<FieldValues>({
    resolver: zodResolver(schema) as Resolver<FieldValues>,
    defaultValues: defaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (props.serverFieldError) {
      form.setError(
        props.serverFieldError.field as never,
        { type: 'server', message: props.serverFieldError.message },
        { shouldFocus: true },
      );
    }
  }, [props.serverFieldError, form]);

  const submit = form.handleSubmit(async (values) => {
    if (isCreate) {
      await (props as CreateProps).onSubmit(values as CreateUserFormValues);
    } else {
      await (props as EditProps).onSubmit(values as EditUserFormValues);
    }
  });

  return (
    <Form layout="vertical" onFinish={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Controller
          control={form.control}
          name="firstName"
          render={({ field, fieldState }) => (
            <Form.Item
              label="First name"
              required
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={100} autoComplete="given-name" />
            </Form.Item>
          )}
        />
        <Controller
          control={form.control}
          name="lastName"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Last name"
              required
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} maxLength={100} autoComplete="family-name" />
            </Form.Item>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Form.Item
            label="Email"
            required
            validateStatus={fieldState.error ? 'error' : ''}
            help={fieldState.error?.message}
          >
            <Input {...field} type="email" maxLength={255} autoComplete="email" />
          </Form.Item>
        )}
      />

      {isCreate && (
        <>
          <Controller
            control={form.control}
            name={'roleId' as never}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Role"
                required
                validateStatus={fieldState.error ? 'error' : ''}
                help={fieldState.error?.message}
              >
                <RolePicker value={field.value as string} onChange={field.onChange} />
              </Form.Item>
            )}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Controller
              control={form.control}
              name={'password' as never}
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Password"
                  required
                  validateStatus={fieldState.error ? 'error' : ''}
                  help={
                    fieldState.error?.message ??
                    'Min 12 chars, upper + lower + digit + symbol'
                  }
                >
                  <Input.Password
                    {...field}
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={form.control}
              name={'confirmPassword' as never}
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Confirm password"
                  required
                  validateStatus={fieldState.error ? 'error' : ''}
                  help={fieldState.error?.message}
                >
                  <Input.Password
                    {...field}
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </Form.Item>
              )}
            />
          </div>
        </>
      )}

      <Space style={{ marginTop: 8 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={props.submitting}
          disabled={props.submitting}
        >
          {isCreate ? 'Create user' : 'Save changes'}
        </Button>
        <Button onClick={props.onCancel}>Cancel</Button>
      </Space>
    </Form>
  );
};
