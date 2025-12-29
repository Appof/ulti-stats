import { makeAutoObservable, runInAction } from 'mobx'
import type { User } from 'firebase/auth'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

export class AuthStore {
  user: User | null = null
  isLoading = true
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
    this.initAuthListener()
  }

  private initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if the user's email is allowed
        const isAllowed = await this.isEmailAllowed(user.email)
        if (!isAllowed) {
          await signOut(auth)
          runInAction(() => {
            this.user = null
            this.isLoading = false
            this.error = 'Access denied. Your email is not authorized to use this app.'
          })
          return
        }
      }
      
      runInAction(() => {
        this.user = user
        this.isLoading = false
      })
    })
  }

  private async isEmailAllowed(email: string | null): Promise<boolean> {
    if (!email) return false
    
    try {
      // Document ID is the email itself (lowercase)
      const emailDocRef = doc(db, 'allowedEmails', email.toLowerCase())
      const emailDoc = await getDoc(emailDocRef)
      return emailDoc.exists()
    } catch (error) {
      console.error('Error checking allowed emails:', error)
      // If we can't check (e.g., collection doesn't exist), deny access for safety
      return false
    }
  }

  get isAuthenticated() {
    return !!this.user
  }

  async signInWithGoogle() {
    this.isLoading = true
    this.error = null

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Check if email is allowed
      const isAllowed = await this.isEmailAllowed(result.user.email)
      if (!isAllowed) {
        await signOut(auth)
        runInAction(() => {
          this.user = null
          this.error = 'Access denied. Your email is not authorized to use this app.'
        })
        return
      }
      
      runInAction(() => {
        this.user = result.user
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Sign in failed'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async logout() {
    try {
      await signOut(auth)
      runInAction(() => {
        this.error = null
      })
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Sign out failed'
      })
    }
  }

  clearError() {
    this.error = null
  }
}
