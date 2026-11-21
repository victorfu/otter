export interface Asset {
	url: string
	name: string
	platform: string
	arch: string
}

export interface LatestRelease {
	version: string
	assets: Array<Asset>
}
