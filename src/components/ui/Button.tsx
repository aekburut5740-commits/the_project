"use client"
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>

export default function Button(props: Props) {
  return (
    <button {...props} className={`px-4 py-2 rounded bg-foreground text-background ${props.className || ''}`} />
  )
}
