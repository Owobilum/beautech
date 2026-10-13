import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './drawer';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} label="Navigation">
        <button type="button">First link</button>
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  it('opens as a named dialog and closes with Escape, returning focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open menu' });

    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Navigation' });
    // Focus moves into the dialog (Headless UI focuses the dialog itself
    // unless a child has autoFocus).
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    );

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
