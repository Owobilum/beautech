import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Drawer, MenuIcon, NavList, NavListItem } from '@owobilum/ui';
import { useState } from 'react';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        leadingIcon={<MenuIcon />}
        onClick={() => setOpen(true)}
      >
        Open navigation
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} label="Navigation">
        <nav aria-label="Sections" className="p-3">
          <NavList>
            <NavListItem current onClick={() => setOpen(false)}>
              Overview
            </NavListItem>
            <NavListItem onClick={() => setOpen(false)}>Settings</NavListItem>
          </NavList>
        </nav>
      </Drawer>
    </>
  );
}

const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  args: {
    open: false,
    label: 'Navigation',
    onClose: () => undefined,
    children: null,
  },
  render: () => <DrawerDemo />,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Modal side panel: focus moves inside, Escape closes and returns focus. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const opener = canvas.getByRole('button', { name: 'Open navigation' });
    await userEvent.click(opener);
    // The dialog is portalled outside the story canvas.
    const dialog = await screen.findByRole('dialog', { name: 'Navigation' });
    await expect(dialog).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  },
};
