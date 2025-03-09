import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import friendshipReducer from './slices/friendshipSlice'  // Import your friendship reducer

export const store = configureStore({
    reducer: {
        user: userReducer,
        friendship: friendshipReducer  // Add the friendship slice to the store
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch