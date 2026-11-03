import React from 'react'

export default function LoadingSkeleton({ className='' }){
  return (
    <div className={`animate-pulse bg-white/5 rounded-md ${className}`} />
  )
}
