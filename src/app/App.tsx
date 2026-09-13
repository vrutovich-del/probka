import { RouterProvider } from 'react-router';
import { ToastHost } from '../components/ToastHost';
import { router } from './router';

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>
  );
}
