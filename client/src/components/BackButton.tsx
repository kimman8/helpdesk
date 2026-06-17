import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BackButton() {
  const navigate = useNavigate()
  return (
    <Button variant="ghost" size="sm" className="mb-6 -ml-1" onClick={() => navigate(-1)}>
      <ArrowLeft className="h-4 w-4 mr-1" />
      Back
    </Button>
  )
}
