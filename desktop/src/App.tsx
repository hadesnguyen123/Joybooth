import { useAppStore } from './store/appStore'
import IdleScreen from './screens/IdleScreen'
import SelectFrameSizeScreen from './screens/SelectFrameSizeScreen'
import SelectLayoutScreen from './screens/SelectLayoutScreen'
import CaptureScreen from './screens/CaptureScreen'
import ThemeSelectScreen from './screens/ThemeSelectScreen'
import StickerScreen from './screens/StickerScreen'
import ReviewScreen from './screens/ReviewScreen'
import AdminScreen from './screens/AdminScreen'
import './App.css'

export default function App() {
  const screen = useAppStore((s) => s.screen)

  return (
    <div className="app-root">
      {screen === 'idle' && <IdleScreen />}
      {screen === 'select-size' && <SelectFrameSizeScreen />}
      {screen === 'select-layout' && <SelectLayoutScreen />}
      {screen === 'capture' && <CaptureScreen />}
      {screen === 'select-theme' && <ThemeSelectScreen />}
      {screen === 'select-sticker' && <StickerScreen />}
      {screen === 'review' && <ReviewScreen />}
      {screen === 'admin' && <AdminScreen />}
    </div>
  )
}
