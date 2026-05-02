import { css, cx } from 'styled-system/css'
import type { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'

export const inputClass = css({
  display: 'block',
  width: '100%',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  bg: 'background',
  color: 'foreground',
  borderRadius: 'btn',
  px: '3',
  py: '2',
  fontSize: 'base',
  outline: 'none',
  fontFamily: 'sans',
  _focus: { borderColor: 'accent' },
  _placeholder: { color: 'foregroundMuted' },
})

export const selectClass = css({
  display: 'block',
  width: '100%',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  bg: 'background',
  color: 'foreground',
  borderRadius: 'btn',
  px: '3',
  py: '2',
  fontSize: 'base',
  outline: 'none',
  fontFamily: 'sans',
  cursor: 'pointer',
  _focus: { borderColor: 'accent' },
})

const labelClass = css({
  display: 'block',
  fontSize: 'sm',
  fontWeight: 'medium',
  color: 'foregroundMuted',
  mb: '1',
})

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}
interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
}

export function Input({ className, ...props }: InputProps) {
  return <input className={cx(inputClass, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cx(selectClass, className)} {...props}>
      {children}
    </select>
  )
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={cx(labelClass, className)} {...props}>
      {children}
    </label>
  )
}
