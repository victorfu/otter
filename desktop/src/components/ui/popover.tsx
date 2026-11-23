'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '~/lib/style'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
	({ className, align = 'center', sideOffset = 4, onWheel, onTouchMove, ...props }, ref) => (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-native-float=""
				ref={ref}
				align={align}
				sideOffset={sideOffset}
				// A modal Dialog (Settings) blocks wheel and touch scrolling on everything outside its own
				// content, and this content is portaled to <body>. Stop those events here, before they reach
				// the dialog's document listener, so a popover list opened from a dialog still scrolls.
				onWheel={event => {
					event.stopPropagation()
					onWheel?.(event)
				}}
				onTouchMove={event => {
					event.stopPropagation()
					onTouchMove?.(event)
				}}
				className={cn(
					'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in-smooth data-[state=closed]:animate-out-smooth origin-[--radix-popover-content-transform-origin]',
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	),
)
PopoverContent.displayName = PopoverPrimitive.Content.displayName

const PopoverAnchor = PopoverPrimitive.Anchor

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
