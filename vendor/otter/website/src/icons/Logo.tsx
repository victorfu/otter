import { cn } from '~/lib/style'

export default function Logo({ className }: { className?: string }) {
	return <img src={import.meta.env.BASE_URL + 'logo.png'} alt="" className={cn('size-8 shrink-0', className)} />
}
