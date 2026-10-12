import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, type SelectOption } from './select';

const roles: SelectOption<string>[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access to all settings',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage members and billing',
  },
  { value: 'member', label: 'Member', description: 'Can view and comment' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

function renderSelect(props: Partial<Parameters<typeof Select<string>>[0]>) {
  return render(<Select label="Member role" options={roles} {...props} />);
}

describe('Select', () => {
  it('renders a labelled button showing the selected option', () => {
    renderSelect({ defaultValue: 'member', description: 'Pick a role.' });
    const button = screen.getByRole('button', { name: /Member role/ });

    expect(button).toHaveTextContent('Member');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAccessibleDescription('Pick a role.');
  });

  it('shows the placeholder when nothing is selected', () => {
    renderSelect({ placeholder: 'Choose a role' });

    expect(screen.getByRole('button')).toHaveTextContent('Choose a role');
  });

  it('opens on click and selects an option', async () => {
    const onChange = vi.fn();
    renderSelect({ defaultValue: 'member', onChange });

    await userEvent.click(screen.getByRole('button'));
    const listbox = screen.getByRole('listbox');
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('option', { name: /Member/, selected: true }),
    ).toBeInTheDocument();
    expect(listbox).toBeVisible();

    await userEvent.click(screen.getByRole('option', { name: /Admin/ }));

    expect(onChange).toHaveBeenCalledWith('admin');
    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button')).toHaveTextContent('Admin');
  });

  it('is fully keyboard operable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSelect({ defaultValue: 'owner', onChange });

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    // Like a native select, Space / arrows open it (Enter submits the form).
    await user.keyboard(' ');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // Focus starts on the selected option.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('member');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('works as a controlled component', async () => {
    function Controlled() {
      const [role, setRole] = useState('viewer');
      return (
        <>
          <Select
            label="Member role"
            options={roles}
            value={role}
            onChange={setRole}
          />
          <output>{role}</output>
        </>
      );
    }
    render(<Controlled />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('option', { name: /Owner/ }));

    expect(screen.getByRole('status')).toHaveTextContent('owner');
    expect(screen.getByRole('button')).toHaveTextContent('Owner');
  });

  it('skips disabled options', async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Member role"
        options={[roles[0], { ...roles[1], disabled: true }, roles[2]]}
        defaultValue="owner"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('option', { name: /Admin/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('member');
  });

  it('does not open when disabled', async () => {
    renderSelect({ defaultValue: 'viewer', disabled: true });
    const button = screen.getByRole('button');

    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('exposes the error state', () => {
    renderSelect({ error: 'Choose a role.' });
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('data-invalid');
    expect(button).toHaveAccessibleDescription('Choose a role.');
  });

  it('submits its value with a form via name', () => {
    const { container } = renderSelect({ name: 'role', defaultValue: 'admin' });

    expect(container.querySelector('input[name="role"]')).toHaveValue('admin');
  });
});
