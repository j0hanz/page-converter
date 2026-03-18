import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

interface LockfilePackage {
  dependencies?: Record<string, string>;
}

interface PackageLock {
  packages?: Record<string, LockfilePackage>;
}

function readPackageLockPackages(): Record<string, LockfilePackage> {
  try {
    const packageLockPath = path.join(process.cwd(), "package-lock.json");
    const packageLock = JSON.parse(
      fs.readFileSync(packageLockPath, "utf8"),
    ) as PackageLock;

    return packageLock.packages ?? {};
  } catch {
    return {};
  }
}

function resolveDependencyPath(
  packages: Record<string, LockfilePackage>,
  dependencyName: string,
  fromPackagePath: string,
): string | null {
  const nestedPath = `${fromPackagePath}/node_modules/${dependencyName}`;
  if (packages[nestedPath]) {
    return nestedPath;
  }

  const hoistedPath = `node_modules/${dependencyName}`;
  if (packages[hoistedPath]) {
    return hoistedPath;
  }

  const packageSuffix = `/node_modules/${dependencyName}`;
  for (const packagePath of Object.keys(packages)) {
    if (packagePath.endsWith(packageSuffix)) {
      return packagePath;
    }
  }

  return null;
}

function collectPackageTraceGlobs(packageName: string): string[] {
  const packages = readPackageLockPackages();
  const rootPackagePath = `node_modules/${packageName}`;
  const visitedPackagePaths = new Set<string>();

  const visit = (packagePath: string | null) => {
    if (!packagePath || visitedPackagePaths.has(packagePath)) {
      return;
    }

    const packageData = packages[packagePath];
    if (!packageData) {
      return;
    }

    visitedPackagePaths.add(packagePath);

    for (const dependencyName of Object.keys(packageData.dependencies ?? {})) {
      visit(resolveDependencyPath(packages, dependencyName, packagePath));
    }
  };

  visit(rootPackagePath);

  if (visitedPackagePaths.size === 0) {
    return [`./${rootPackagePath}/**/*`];
  }

  return [...visitedPackagePaths]
    .sort()
    .map((packagePath) => `./${packagePath}/**/*`);
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/transform": collectPackageTraceGlobs("@j0hanz/fetch-url-mcp"),
  },
};

export default nextConfig;
