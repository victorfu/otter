import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Layout from '~/components/Layout'
import Home from '~/pages/Home'
import Docs from '~/pages/Docs'
import Changelog from '~/pages/Changelog'
import Models from '~/pages/Models'

export default function App() {
	return (
		<BrowserRouter basename="/otter">
			<Routes>
				<Route element={<Layout />}>
					<Route index element={<Home />} />
					<Route path="models" element={<Models />} />
					<Route path="docs" element={<Docs />} />
					<Route path="changelog" element={<Changelog />} />
					<Route path="changelog/:version" element={<Changelog />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
		</BrowserRouter>
	)
}
