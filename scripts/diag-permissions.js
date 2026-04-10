/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
      storeUserRoles: {
        include: {
          role: {
            include: {
              storeRolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  })

  for (const u of users) {
    const globalRoles = u.userRoles.map((ur) => ur.role.name)
    const perms = new Set()
    u.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => perms.add(rp.permission.name))
    })
    u.storeUserRoles.forEach((sur) => {
      sur.role.storeRolePermissions.forEach((srp) => perms.add(srp.permission.name))
    })
    if (u.storeUserRoles.length > 0) perms.add("stores.view")

    console.log(
      JSON.stringify({
        email: u.email,
        globalRoles,
        storeRoleAssignments: u.storeUserRoles.length,
        effectivePermissionCount: perms.size,
      }),
    )
  }

  const totals = {
    users: await prisma.user.count(),
    userRoles: await prisma.userRole.count(),
    permissions: await prisma.permission.count(),
    roles: await prisma.role.count(),
  }
  console.log("--- totals:", JSON.stringify(totals))
}

main()
  .catch((e) => {
    console.error("DB_ERROR:", e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
