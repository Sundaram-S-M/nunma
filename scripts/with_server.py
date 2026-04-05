import argparse
import subprocess
import time
import socket
import sys
import os
import signal

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def main():
    parser = argparse.ArgumentParser(description="Lifecycle manager for the Nunma test environment.")
    parser.add_argument("--server", action='append', nargs=2, metavar=('CMD', 'PORT'), help="Command and port for the server to launch.")
    parser.add_argument("command", nargs=argparse.REMAINDER, help="The final command to run after servers are up.")
    args = parser.parse_args()

    if not args.server:
        print("Error: No servers specified. Use --server 'CMD' PORT")
        sys.exit(1)

    processes = []
    try:
        # Start all servers
        for cmd, port in args.server:
            print(f"[*] Starting server: '{cmd}' on port {port}")
            # Use shell=True for complex commands like 'npm run dev'
            p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, universal_newlines=True)
            processes.append(p)
            
            # Wait for the port to be open
            print(f"[*] Waiting for port {port} to open...")
            start_time = time.time()
            timeout = 60  # 60 seconds timeout
            while not is_port_open(int(port)):
                if time.time() - start_time > timeout:
                    print(f"[!] Timeout waiting for port {port}. Terminating processes.")
                    for proc in processes:
                        proc.terminate()
                    sys.exit(1)
                time.sleep(1)
            print(f"[+] Port {port} is open and ready.")

        # Run the final command (the test script)
        if args.command:
            # Reconstruct the command if it was split by argparse
            full_command = " ".join(args.command)
            # Remove any leading pipe symbols or double dashes used to separate the command
            if full_command.startswith("-- "):
                full_command = full_command[3:]
            
            print(f"[*] Launching master test script: '{full_command}'")
            test_proc = subprocess.run(full_command, shell=True)
            print(f"[*] Test process finished with return code: {test_proc.returncode}")
            sys.exit(test_proc.returncode)
        else:
            print("[!] No test command provided. Servers will stay running (Press Ctrl+C to stop).")
            while True:
                time.sleep(1)

    except KeyboardInterrupt:
        print("\n[*] Interrupted. Shutting down servers...")
    finally:
        # Cleanup
        for p in processes:
            print(f"[*] Terminating server process {p.pid}...")
            # On Windows, taskkill might be necessary for subprocesses spawned by shell=True
            if sys.platform == "win32":
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
                p.wait()
        print("[*] All servers stopped.")

if __name__ == "__main__":
    main()
