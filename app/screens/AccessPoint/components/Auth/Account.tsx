import { Session } from '@supabase/supabase-js'
import React, { useState } from 'react'
import { Alert, Button, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../../../../lib/supabase'

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome!</Text>
      <Text style={styles.email}>{session.user.email}</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title={loading ? "Signing Out..." : "Sign Out"} 
          onPress={handleSignOut} 
          disabled={loading}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  }
})