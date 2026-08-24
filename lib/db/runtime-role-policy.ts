export interface RuntimeRole {
  rolname: string
  rolsuper: boolean
  rolcreaterole: boolean
  rolcreatedb: boolean
  rolbypassrls: boolean
}

export function isPrivilegedRuntimeRole(role: RuntimeRole) {
  return (
    role.rolsuper || role.rolcreaterole || role.rolcreatedb || role.rolbypassrls
  )
}
