// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import userReducer from './slices/userSlice'
import friendshipReducer from './slices/friendshipSlice'
import chatReducer from './slices/chatSlice'  // Import the new chat reducer

export const store = configureStore({
    reducer: {
        user: userReducer,
        friendship: friendshipReducer,
        chat: chatReducer  // Add the chat slice to the store
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore socket instance in the store
                ignoredActions: ['chat/connectSocket/fulfilled'],
                ignoredPaths: ['chat.socket'],
            },
        }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector