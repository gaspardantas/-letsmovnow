import {
  createContext, useContext, useEffect,
  useRef, useState, type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  unreadCount: number
  setUnreadCount: (n: number) => void
}

const SocketContext = createContext<SocketContextType | null>(null)

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setUnreadCount(0)
      return
    }

    // Connect with user ID for routing events
    const socket = io(SOCKET_URL, {
      auth: { userId: user._id },
      transports: ['websocket'] as string[],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    // Nav badge — unread messages
    socket.on('unreadCountUpdate', () => {
      // Trigger a refetch by bumping the count signal
      setUnreadCount((prev) => prev + 1)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user])

  return (
    <SocketContext.Provider value={{
      socket:        socketRef.current,
      unreadCount,
      setUnreadCount,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
