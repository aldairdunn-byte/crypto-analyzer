import { createPortal } from 'react-dom';
import { type ReactNode } from 'react';

/**
 * ModalPortal — teleports modal content to document.body.
 *
 * Fixes the stacking context issue where `position: fixed` elements
 * rendered inside an `overflow: auto` ancestor lose viewport-based
 * positioning and get clipped/hidden behind content.
 *
 * Usage: wrap the outermost element of any modal/drawer in <ModalPortal>.
 */
export const ModalPortal = ({ children }: { children: ReactNode }) => {
  return createPortal(children, document.body);
};
